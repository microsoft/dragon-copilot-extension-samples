import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { FluentProvider, webLightTheme } from '@fluentui/react-components';
import { TestingPanel } from '../TestingPanel';

const manifestInfo = {
  name: 'sample-extension',
  version: '0.0.1',
  toolCount: 1,
  capabilities: ['reportQuality'],
};

let fetchMock: ReturnType<typeof vi.fn>;

function json(body: unknown) {
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
}

/**
 * Renders the panel and waits for both mount fetches to settle, so the state
 * updates they trigger happen inside `act` rather than during an assertion.
 */
async function renderPanel() {
  render(
    <FluentProvider theme={webLightTheme}>
      <TestingPanel manifestInfo={manifestInfo} manifestRevision={0} />
    </FluentProvider>,
  );
  await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
  await act(async () => {});
}

beforeEach(() => {
  fetchMock = vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.endsWith('/api/manifest/capabilities')) {
      return json([{ name: 'reportQuality', description: 'Quality checks', toolCount: 1 }]);
    }
    if (url.includes('/tools')) {
      return json([]);
    }
    return json({});
  });
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('TestingPanel tabs', () => {
  it('adds the Dragon Copilot Preview tab alongside the existing tabs', async () => {
    await renderPanel();

    expect(screen.getByRole('tab', { name: 'Setup' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Results' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Outputs' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Dragon Copilot Preview' })).toBeInTheDocument();
  });

  it('shows the preview empty state before a tool has been run', async () => {
    await renderPanel();

    fireEvent.click(screen.getByRole('tab', { name: 'Dragon Copilot Preview' }));

    expect(screen.getByText('No preview yet')).toBeInTheDocument();
  });

  it('leaves the raw JSON Results and Outputs tabs unchanged', async () => {
    await renderPanel();

    fireEvent.click(screen.getByRole('tab', { name: 'Results' }));
    expect(screen.getByText('No results yet. Run a test from the Setup tab.')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: 'Outputs' }));
    expect(screen.getByText('No outputs yet. Run a test from the Setup tab.')).toBeInTheDocument();
  });
});
