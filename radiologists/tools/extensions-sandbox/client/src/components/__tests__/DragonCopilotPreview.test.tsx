import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
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
  it('shows the Report optimization card in its not-run state before a tool has run', () => {
    render(<DragonCopilotPreview result={null} toolName="sampleQualityCheckTool" />);

    const frame = document.querySelector('.dc-preview-frame') as HTMLElement;
    expect(frame).not.toBeNull();
    expect(within(frame).getByRole('heading', { name: 'Report optimization' })).toBeInTheDocument();
    expect(within(frame).getByText('Run smart impression to view suggestions.')).toBeInTheDocument();
    expect(within(frame).getByText('sampleQualityCheckTool')).toBeInTheDocument();
    expect(within(frame).queryByText('AI-generated content may be incorrect')).toBeNull();

    const hint = screen.getByText(/run a tool from the Setup tab/);
    expect(hint.closest('.dc-preview-frame')).toBeNull();
    expect(screen.queryByText('No preview yet')).toBeNull();
  });

  it('flags an Adaptive Card as unsupported and shows it as JSON', () => {
    render(<DragonCopilotPreview result={cardResult} toolName="summaryTool" />);

    expect(
      screen.getByText(
        'This output is an Adaptive Card. Dragon Copilot for radiologists does not support Adaptive Cards, so the clinician would not see it. It is shown here as formatted JSON.',
      ),
    ).toHaveClass('dc-preview-fallback-reason-warning');
    const fallback = document.querySelector('.dc-preview-json');
    expect(fallback?.querySelector('pre')?.textContent).toContain('Follow-up imaging recommended');
    expect(screen.getByText('Summary Card')).toBeInTheDocument();
    expect(screen.getByText('summaryTool')).toBeInTheDocument();
    expect(screen.queryByTestId('adaptive-card-host')).toBeNull();
  });

  it('renders recommendations as a Report optimization card, not raw JSON', () => {
    render(
      <DragonCopilotPreview
        result={recommendationResult}
        extensionName="sampleQualityCheckExtension"
      />,
    );

    const card = document.querySelector('.dc-report-optimization') as HTMLElement;
    expect(card).not.toBeNull();
    expect(within(card).getByRole('heading', { name: 'Report optimization (1)' })).toBeInTheDocument();
    expect(within(card).getByText('Clinical')).toBeInTheDocument();
    expect(card.querySelector('.dc-recommendation-text')?.textContent).toBe(
      'Consider adding comparison with prior studies No comparison section found in report (Sample Quality Check Extension)',
    );
    expect(within(card).getByText('AI-generated content may be incorrect')).toBeInTheDocument();
    expect(within(card).getByText('Third-party generated content')).toBeInTheDocument();
    expect(document.querySelector('.dc-preview-json')).toBeNull();
  });

  it('collapses and re-opens the card from its header, open by default', () => {
    render(<DragonCopilotPreview result={recommendationResult} />);

    const toggle = screen.getByRole('button', { name: 'Report optimization (1)' });
    const description = screen.getByText('Consider adding comparison with prior studies');
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(description).toBeVisible();

    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(description).not.toBeVisible();
    expect(screen.getByText('AI-generated content may be incorrect')).not.toBeVisible();

    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(description).toBeVisible();
  });

  it('does not show severity, which the Report optimization card omits', () => {
    render(<DragonCopilotPreview result={recommendationResult} />);

    expect(screen.queryByText('Medium')).toBeNull();
    expect(screen.queryByText(/40\s*%/)).toBeNull();
    expect(screen.queryByRole('meter')).toBeNull();
    expect(screen.getByText(/does not show severityScorePercent or additionalInfo/)).toBeInTheDocument();
  });

  it('omits the partner credit when the extension name is unknown', () => {
    render(<DragonCopilotPreview result={recommendationResult} />);

    expect(document.querySelector('.dc-recommendation-text')?.textContent).toBe(
      'Consider adding comparison with prior studies No comparison section found in report',
    );
    expect(document.querySelector('.dc-recommendation-attribution')).toBeNull();
  });

  it('groups recommendations by category in order of first appearance', () => {
    render(
      <DragonCopilotPreview
        result={{
          processResponse: {
            payload: {
              qualityCheckResult: {
                recommendations: [
                  { qualityCheckType: 'Billing', description: 'Add modifier 50', reason: 'Bilateral exam' },
                  { qualityCheckType: 'Clinical', description: 'Add comparison', reason: 'No priors cited' },
                  { qualityCheckType: 'Billing', description: 'Document contrast', reason: 'Contrast billed' },
                ],
              },
            },
          },
        }}
      />,
    );

    expect(screen.getByRole('heading', { name: 'Report optimization (3)' })).toBeInTheDocument();
    const groups = [...document.querySelectorAll<HTMLElement>('.dc-recommendation-group')];
    const categories = groups.map(
      (group) => group.querySelector('.dc-recommendation-category')?.textContent,
    );
    expect(categories).toEqual(['Billing', 'Clinical']);
    const firstGroupItems = within(groups[0])
      .getAllByRole('listitem')
      .map((item) => item.querySelector('.dc-recommendation-description')?.textContent);
    expect(firstGroupItems).toEqual(['Add modifier 50', 'Document contrast']);
  });

  it('shows the run status above the Dragon Copilot frame, not inside it', () => {
    render(<DragonCopilotPreview result={recommendationResult} />);

    const status = screen.getByText('Payload processed successfully.');
    expect(status).toHaveAttribute('role', 'status');
    expect(status.closest('.dc-preview-frame')).toBeNull();
    expect(document.querySelector('.dc-preview-frame')).not.toBeNull();
  });

  it('tells the clinician when there is nothing to flag', () => {
    render(
      <DragonCopilotPreview
        result={{ processResponse: { payload: { qualityCheckResult: { recommendations: [] } } } }}
      />,
    );

    expect(screen.getByRole('heading', { name: 'Report optimization (0)' })).toBeInTheDocument();
    expect(
      screen.getByText('No recommendations — the extension found nothing to flag for this report.'),
    ).toBeInTheDocument();
    expect(document.querySelector('.dc-disclaimers')).toBeNull();
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
    const reason = screen.getByText(
      'This output is not a recognized recommendation list, so it is shown as formatted JSON.',
    );
    expect(reason).not.toHaveClass('dc-preview-fallback-reason-warning');
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

    expect(document.querySelector('.dc-report-optimization')).toBeNull();
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

    expect(screen.queryByText('Run smart impression to view suggestions.')).toBeNull();
    expect(document.querySelector('.dc-preview-frame')).toBeNull();
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
    expect(screen.queryByText('Run smart impression to view suggestions.')).toBeNull();
  });
});
