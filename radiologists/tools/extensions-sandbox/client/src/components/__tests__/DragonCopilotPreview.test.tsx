import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { DragonCopilotPreview } from '../DragonCopilotPreview';

const recommendationResult = {
  status: 200,
  processResponse: {
    success: true,
    message: 'Payload processed successfully.',
    payload: {
      'quality-result': {
        recommendations: [
          {
            qualityCheckType: 'Clinical',
            description: 'Consider adding comparison with prior studies',
            reason: 'No comparison section found in report',
            severityScorePercent: 40,
          },
        ],
      },
    },
  },
};

const cardResult = {
  status: 200,
  processResponse: {
    success: true,
    payload: {
      summaryCard: {
        type: 'AdaptiveCard',
        $schema: 'http://adaptivecards.io/schemas/adaptive-card.json',
        version: '1.5',
        body: [
          { type: 'TextBlock', text: 'Follow-up imaging recommended', weight: 'Bolder' },
          { type: 'TextBlock', text: 'Repeat CT in 3 months.', wrap: true },
        ],
      },
    },
  },
};

describe('DragonCopilotPreview', () => {
  it('shows an empty state when there is no result yet', () => {
    render(<DragonCopilotPreview result={null} />);

    expect(screen.getByText('No preview yet')).toBeInTheDocument();
    expect(
      screen.getByText('Run a tool from the Setup tab to see how its result appears in Dragon Copilot.'),
    ).toBeInTheDocument();
  });

  it('renders an Adaptive Card output with the Adaptive Cards renderer', async () => {
    render(<DragonCopilotPreview result={cardResult} toolName="summaryTool" />);

    // Awaited: the card view is code-split, so it mounts a tick after render.
    const host = await screen.findByTestId('adaptive-card-host');
    expect(within(host).getByText('Follow-up imaging recommended')).toBeInTheDocument();
    expect(within(host).getByText('Repeat CT in 3 months.')).toBeInTheDocument();
    expect(screen.getByText('Summary Card')).toBeInTheDocument();
    expect(screen.getByText('summaryTool')).toBeInTheDocument();
  });

  it('renders recommendations as a clinician-friendly summary, not raw JSON', () => {
    render(<DragonCopilotPreview result={recommendationResult} />);

    expect(screen.getByText('Consider adding comparison with prior studies')).toBeInTheDocument();
    expect(screen.getByText('No comparison section found in report')).toBeInTheDocument();
    expect(screen.getByText('Clinical')).toBeInTheDocument();
    expect(screen.getByText('Medium')).toBeInTheDocument();
    expect(screen.getByLabelText('Severity 40 percent')).toHaveAttribute('aria-valuenow', '40');
    expect(screen.getByText('Payload processed successfully.')).toBeInTheDocument();
    expect(document.querySelector('.dc-preview-json')).toBeNull();
  });

  it('tells the clinician when there is nothing to flag', () => {
    render(
      <DragonCopilotPreview
        result={{ processResponse: { payload: { qualityCheckResult: { recommendations: [] } } } }}
      />,
    );

    expect(
      screen.getByText('No recommendations — the extension found nothing to flag for this report.'),
    ).toBeInTheDocument();
  });

  it('falls back to the formatted-JSON view for output it cannot render as a card', () => {
    render(
      <DragonCopilotPreview
        result={{ processResponse: { payload: { measurements: { lesionCount: 3 } } } }}
      />,
    );

    const fallback = document.querySelector('.dc-preview-json');
    expect(fallback).not.toBeNull();
    expect(fallback?.querySelector('pre')?.textContent).toContain('"lesionCount": 3');
    expect(
      screen.getByText(
        'This output is not an Adaptive Card or a recognized recommendation list, so it is shown as formatted JSON.',
      ),
    ).toBeInTheDocument();
  });

  it('does not claim "nothing to flag" for an unrelated empty array', () => {
    render(<DragonCopilotPreview result={{ processResponse: { payload: { measurements: [] } } }} />);

    expect(
      screen.queryByText('No recommendations — the extension found nothing to flag for this report.'),
    ).toBeNull();
    expect(document.querySelector('.dc-preview-json')).not.toBeNull();
  });

  it('does not give clinical framing to an array that merely has descriptions', () => {
    render(
      <DragonCopilotPreview
        result={{ processResponse: { payload: { attachments: [{ description: 'chest x-ray' }] } } }}
      />,
    );

    expect(document.querySelector('.dc-preview-recommendations')).toBeNull();
    const fallback = document.querySelector('.dc-preview-json');
    expect(fallback?.querySelector('pre')?.textContent).toContain('chest x-ray');
  });

  it('reports an HTTP failure instead of blaming the response shape', () => {
    render(
      <DragonCopilotPreview
        result={{ status: 500, statusText: 'Internal Server Error', rawBody: { error: 'boom' } }}
      />,
    );

    expect(
      screen.getByText(
        'The extension returned HTTP 500 Internal Server Error. Dragon Copilot would show nothing to the clinician for this result.',
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText('The error response body is shown as formatted JSON.'),
    ).toBeInTheDocument();
  });

  it('still reports an HTTP failure when the error body is empty', () => {
    render(<DragonCopilotPreview result={{ status: 502, statusText: 'Bad Gateway' }} />);

    expect(screen.queryByText('No preview yet')).toBeNull();
    expect(
      screen.getByText(
        'The extension returned HTTP 502 Bad Gateway. Dragon Copilot would show nothing to the clinician for this result.',
      ),
    ).toBeInTheDocument();
  });

  it('keeps the not-yet-available result sources out of the selector', () => {
    render(<DragonCopilotPreview result={recommendationResult} />);

    expect(screen.queryByRole('button', { name: /Pixel AI app/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /PowerScribe/ })).toBeNull();
    expect(screen.queryByRole('group', { name: 'Result source' })).toBeNull();
  });

  it('explains the empty state when a not-yet-available source is requested', () => {
    render(<DragonCopilotPreview result={recommendationResult} source="pixel-ai" />);

    expect(screen.getByText('Pixel AI app results are not available in the sandbox yet.')).toBeInTheDocument();
  });
});
