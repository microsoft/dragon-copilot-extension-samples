import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { FluentProvider, webLightTheme } from '@fluentui/react-components';
import { ManifestEditor } from '../ManifestEditor';

const cli = vi.hoisted(() => ({
  yaml: 'name: generated-extension\n',
  results: [] as Array<boolean | void>,
}));

// The wizard's form is covered by the server's CLI tests; here it only has to
// hand the editor a generated manifest and report whether the editor took it.
vi.mock('../CliWizardDialog', () => ({
  CliWizardDialog: ({ onGenerated }: { onGenerated: (yaml: string) => boolean | void }) => (
    <button type="button" onClick={() => cli.results.push(onGenerated(cli.yaml))}>
      Simulate CLI generation
    </button>
  ),
}));

const EXISTING_MANIFEST = 'name: my-extension\n';

let fetchMock: ReturnType<typeof vi.fn>;
let confirmMock: ReturnType<typeof vi.fn>;
let onReset: Mock<() => void>;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function validateCalls() {
  return fetchMock.mock.calls.filter(([input]) => String(input).endsWith('/api/manifest/validate'));
}

function renderEditor() {
  render(
    <FluentProvider theme={webLightTheme}>
      <ManifestEditor onManifestLoaded={vi.fn()} onManifestEditing={vi.fn()} onReset={onReset} />
    </FluentProvider>,
  );
}

async function uploadExistingManifest() {
  const input = document.querySelector<HTMLInputElement>('input[type="file"]');
  expect(input).not.toBeNull();
  const file = new File([EXISTING_MANIFEST], 'manifest.yaml', { type: 'application/x-yaml' });
  fireEvent.change(input!, { target: { files: [file] } });
  await waitFor(() =>
    expect(fetchMock.mock.calls.some(([input]) => String(input).endsWith('/api/manifest/raw'))).toBe(true),
  );
  await act(async () => {});
  onReset.mockClear();
}

async function simulateGeneration() {
  fireEvent.click(screen.getByRole('button', { name: 'Simulate CLI generation' }));
  await act(async () => {});
  return cli.results.at(-1);
}

beforeEach(() => {
  cli.results.length = 0;
  onReset = vi.fn<() => void>();
  confirmMock = vi.fn();
  vi.stubGlobal('confirm', confirmMock);
  fetchMock = vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.endsWith('/api/manifest/upload')) return json({ success: true });
    if (url.endsWith('/api/manifest/raw')) return json({ content: EXISTING_MANIFEST });
    if (url.endsWith('/api/manifest/validate')) {
      return json({ valid: false, message: 'Manifest has errors.', errors: [] });
    }
    return json({});
  });
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('ManifestEditor CLI wizard', () => {
  it('loads a generated manifest into an empty editor without asking', async () => {
    renderEditor();

    expect(await simulateGeneration()).toBe(true);

    expect(confirmMock).not.toHaveBeenCalled();
    expect(onReset).toHaveBeenCalledTimes(1);
    expect(validateCalls()).toHaveLength(1);
    expect(JSON.parse(validateCalls()[0][1].body as string)).toEqual({ content: cli.yaml });
  });

  it('keeps the current manifest when the user declines to replace it', async () => {
    renderEditor();
    await uploadExistingManifest();
    confirmMock.mockReturnValue(false);

    expect(await simulateGeneration()).toBe(false);

    expect(confirmMock).toHaveBeenCalledTimes(1);
    expect(confirmMock.mock.calls[0][0]).toMatch(/Replace the manifest in the editor/);
    expect(onReset).not.toHaveBeenCalled();
    expect(validateCalls()).toHaveLength(0);
  });

  it('replaces the current manifest once the user confirms', async () => {
    renderEditor();
    await uploadExistingManifest();
    confirmMock.mockReturnValue(true);

    expect(await simulateGeneration()).toBe(true);

    expect(confirmMock).toHaveBeenCalledTimes(1);
    expect(onReset).toHaveBeenCalledTimes(1);
    expect(validateCalls()).toHaveLength(1);
    expect(JSON.parse(validateCalls()[0][1].body as string)).toEqual({ content: cli.yaml });
  });
});
