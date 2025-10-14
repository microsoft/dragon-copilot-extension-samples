import { describe, it, expect } from '@jest/globals';
import { validateIntegrationName, validateVersion, validateUrl, validateEmail, validateTenantId } from '../shared/prompts';

describe('Partner Integration CLI Validation Functions', () => {
  describe('validateIntegrationName', () => {
    it('should accept valid integration names', () => {
      expect(validateIntegrationName('my-integration')).toBe(true);
      expect(validateIntegrationName('Healthcare Integration')).toBe(true);
      expect(validateIntegrationName('EHR_Sync_Tool')).toBe(true);
    });

    it('should reject invalid integration names', () => {
      expect(validateIntegrationName('')).toContain('required');
      expect(validateIntegrationName('ab')).toContain('at least 3 characters');
      expect(validateIntegrationName('-invalid')).toContain('start and end with alphanumeric');
      expect(validateIntegrationName('invalid-')).toContain('start and end with alphanumeric');
    });
  });

  describe('validateVersion', () => {
    it('should accept valid version formats', () => {
      expect(validateVersion('1.0.0')).toBe(true);
      expect(validateVersion('0.1.0')).toBe(true);
      expect(validateVersion('10.20.30')).toBe(true);
    });

    it('should reject invalid version formats', () => {
      expect(validateVersion('')).toContain('required');
      expect(validateVersion('1.0')).toContain('format x.y.z');
      expect(validateVersion('v1.0.0')).toContain('format x.y.z');
      expect(validateVersion('1.0.0-beta')).toContain('format x.y.z');
    });
  });

  describe('validateUrl', () => {
    it('should accept valid URLs', () => {
      expect(validateUrl('https://example.com')).toBe(true);
      expect(validateUrl('http://api.example.com/v1')).toBe(true);
      expect(validateUrl('https://subdomain.example.com:8080/path')).toBe(true);
    });

    it('should reject invalid URLs', () => {
      expect(validateUrl('')).toContain('required');
      expect(validateUrl('not-a-url')).toContain('valid URL');
      expect(validateUrl('ftp://example.com')).toBe(true); // URLs with different protocols are still valid
    });
  });

  describe('validateEmail', () => {
    it('should accept valid email addresses', () => {
      expect(validateEmail('user@example.com')).toBe(true);
      expect(validateEmail('test.email+tag@subdomain.example.co.uk')).toBe(true);
    });

    it('should reject invalid email addresses', () => {
      expect(validateEmail('')).toContain('required');
      expect(validateEmail('invalid-email')).toContain('valid email');
      expect(validateEmail('@example.com')).toContain('valid email');
      expect(validateEmail('user@')).toContain('valid email');
    });
  });

  describe('validateTenantId', () => {
    it('should accept valid GUID formats', () => {
      expect(validateTenantId('12345678-1234-1234-1234-123456789abc')).toBe(true);
      expect(validateTenantId('ABCDEF12-3456-7890-ABCD-EF1234567890')).toBe(true);
      expect(validateTenantId('00000000-0000-0000-0000-000000000000')).toBe(true);
    });

    it('should reject invalid GUID formats', () => {
      expect(validateTenantId('')).toContain('required');
      expect(validateTenantId('not-a-guid')).toContain('valid GUID format');
      expect(validateTenantId('12345678-1234-1234-1234')).toContain('valid GUID format');
      expect(validateTenantId('12345678-1234-1234-1234-123456789abcde')).toContain('valid GUID format');
    });
  });
});