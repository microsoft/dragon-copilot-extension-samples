import { describe, it, expect } from 'vitest';
import { parseInputValues, groupInputsByName, parseAndGroupInputs } from '../input-parsing.js';

/**
 * Unit tests for form input parsing and grouping.
 * These functions sit between the UI form and payload validation, so an
 * empty value leaking through as an empty object causes a spurious 422.
 */

describe('parseInputValues', () => {
  it('parses JSON object and array strings', () => {
    const result = parseInputValues({
      obj: '{"reportText":"findings"}',
      arr: '[1,2,3]',
    });
    expect(result.obj).toEqual({ reportText: 'findings' });
    expect(result.arr).toEqual([1, 2, 3]);
  });

  it('keeps primitive-looking strings as strings to protect clinical identifiers', () => {
    const result = parseInputValues({
      mrn: '0012345',
      accession: '42',
      flag: 'true',
    });
    expect(result.mrn).toBe('0012345');
    expect(result.accession).toBe('42');
    expect(result.flag).toBe('true');
  });

  it('falls back to the raw string when JSON parsing fails', () => {
    const result = parseInputValues({ broken: '{not valid json}' });
    expect(result.broken).toBe('{not valid json}');
  });
});

describe('groupInputsByName', () => {
  it('groups dot-delimited paths under the input name', () => {
    const result = groupInputsByName({
      'report.reportText': 'findings',
      'report.reportId': 'r-1',
    });
    expect(result).toEqual({ report: { reportText: 'findings', reportId: 'r-1' } });
  });

  it('keeps non-dotted keys as-is', () => {
    expect(groupInputsByName({ report: 'findings' })).toEqual({ report: 'findings' });
  });

  it('omits a group entirely when every field is empty', () => {
    const result = groupInputsByName({
      'report.reportText': '',
      'report.reportId': '',
    });
    expect(result).toEqual({});
    expect('report' in result).toBe(false);
  });

  it('omits a group whose fields are null or undefined', () => {
    const result = groupInputsByName({
      'report.reportText': null,
      'report.reportId': undefined,
    });
    expect(result).toEqual({});
  });

  it('keeps a group that has at least one non-empty field', () => {
    const result = groupInputsByName({
      'report.reportText': 'findings',
      'report.reportId': '',
    });
    expect(result).toEqual({ report: { reportText: 'findings' } });
  });

  it('omits empty non-dotted values', () => {
    expect(groupInputsByName({ report: '', priorReport: 'text' })).toEqual({
      priorReport: 'text',
    });
  });

  it('preserves falsy-but-meaningful values such as 0 and false', () => {
    const result = groupInputsByName({
      'report.score': 0,
      'report.reviewed': false,
    });
    expect(result).toEqual({ report: { score: 0, reviewed: false } });
  });
});

describe('parseAndGroupInputs', () => {
  it('parses then groups in one step', () => {
    const result = parseAndGroupInputs({
      'report.reportText': 'findings',
      'report.metadata': '{"modality":"CT"}',
    });
    expect(result).toEqual({
      report: { reportText: 'findings', metadata: { modality: 'CT' } },
    });
  });

  it('does not emit an empty group for a fully blank optional input', () => {
    const result = parseAndGroupInputs({
      'report.reportText': 'findings',
      'priorReport.reportText': '',
    });
    expect(result).toEqual({ report: { reportText: 'findings' } });
    expect('priorReport' in result).toBe(false);
  });
});
