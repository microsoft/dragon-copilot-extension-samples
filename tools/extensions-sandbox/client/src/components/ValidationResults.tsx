import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useValidation, type ValidationResult, type ValidationCheck } from '../ValidationContext';

/**
 * Displays schema-validation results for a tool execution response.
 *
 * Route: /capabilities/:capabilityName/tools/:toolName/execute
 *
 * On mount the component POSTs a sample payload to the backend validation
 * endpoint and renders the result as a checklist with pass/fail indicators,
 * expandable error details, and action buttons.
 *
 * Results are persisted in React context for consolidated report generation.
 */
export function ValidationResults() {
  const { capabilityName, toolName } = useParams<{
    capabilityName: string;
    toolName: string;
  }>();

  const navigate = useNavigate();
  const { addResult } = useValidation();

  const [result, setResult] = useState<ValidationResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedChecks, setExpandedChecks] = useState<Set<number>>(new Set());
  const [copyToast, setCopyToast] = useState(false);

  // ── Fetch validation results from backend ────────────────────────────
  const runValidation = useCallback(() => {
    if (!toolName) return;
    setLoading(true);
    setError(null);

    const startTime = performance.now();

    fetch(`/api/validate/${encodeURIComponent(toolName)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ response: {} }),
    })
      .then((res) => {
        if (!res.ok && res.status !== 422) {
          throw new Error(`HTTP ${res.status}`);
        }
        return res.json();
      })
      .then((data: ValidationResult) => {
        const executionTimeMs = Math.round(performance.now() - startTime);
        const enriched: ValidationResult = {
          ...data,
          capabilityName,
          executionTimeMs,
        };
        setResult(enriched);
        addResult(enriched);

        // Auto-expand all failed checks
        const failedIndices = new Set<number>();
        enriched.checks.forEach((c, i) => {
          if (!c.passed && c.error) failedIndices.add(i);
        });
        setExpandedChecks(failedIndices);
      })
      .catch((err) => {
        setError(err.message || 'Failed to validate tool response.');
      })
      .finally(() => setLoading(false));
  }, [toolName, capabilityName, addResult]);

  useEffect(() => {
    runValidation();
  }, [runValidation]);

  // ── Toggle error detail expansion ────────────────────────────────────
  const toggleCheck = (index: number) => {
    setExpandedChecks((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  // ── Copy results to clipboard ────────────────────────────────────────
  const handleCopyResults = () => {
    if (!result) return;
    const text = formatResultsAsText(result);
    navigator.clipboard.writeText(text).then(() => {
      setCopyToast(true);
      setTimeout(() => setCopyToast(false), 2500);
    });
  };

  // ── Loading state ────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="validation-results">
        <div className="validation-loading">
          <span className="spinner" /> Validating response for <strong>{toolName}</strong>…
        </div>
      </div>
    );
  }

  // ── Error state ──────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="validation-results">
        <div className="validation-error">
          <p>{error}</p>
          <Link
            to={`/capabilities/${encodeURIComponent(capabilityName ?? '')}/tools`}
            className="btn btn-secondary"
          >
            ← Back to Tools
          </Link>
        </div>
      </div>
    );
  }

  if (!result) return null;

  const { valid, checks, summary } = result;

  return (
    <div className="validation-results">
      {/* Breadcrumb */}
      <nav className="breadcrumb" aria-label="Breadcrumb">
        <Link to="/capabilities">Capabilities</Link>
        <span className="sep">›</span>
        <Link to={`/capabilities/${encodeURIComponent(capabilityName ?? '')}/tools`}>
          {capabilityName}
        </Link>
        <span className="sep">›</span>
        <span>Tools</span>
        <span className="sep">›</span>
        <span>{toolName}</span>
        <span className="sep">›</span>
        <span>Validation Results</span>
      </nav>

      {/* Tool context card */}
      <div className="tool-context">
        <div className="tool-context-row">
          <div>
            <div className="tool-context-label">Tool</div>
            <div className="tool-context-value">{toolName}</div>
          </div>
          <div>
            <div className="tool-context-label">Capability</div>
            <div className="tool-context-value">{capabilityName}</div>
          </div>
          {result.executionTimeMs !== undefined && (
            <div>
              <div className="tool-context-label">Execution Time</div>
              <div className="tool-context-value">{result.executionTimeMs} ms</div>
            </div>
          )}
        </div>
      </div>

      {/* Overall pass/fail header */}
      <div className="validation-header">
        <h2>Validation Results</h2>
        <span className={`badge ${valid ? 'badge-pass' : 'badge-fail'}`}>
          <span className="badge-icon">{valid ? '✓' : '✕'}</span>
          {valid ? 'PASS' : 'FAIL'}
        </span>
      </div>

      {/* Summary text */}
      <p className="validation-summary">
        {valid
          ? `All ${summary.passed} checks passed — response matches the expected schema.`
          : `${summary.failed} of ${summary.passed + summary.failed} checks failed — response does not match the expected schema.`}
      </p>

      {/* Check list */}
      <ul className="check-list" role="list" aria-label="Validation checks">
        {checks.map((check, index) => (
          <CheckItem
            key={index}
            check={check}
            index={index}
            expanded={expandedChecks.has(index)}
            onToggle={toggleCheck}
          />
        ))}
      </ul>

      {/* Action buttons */}
      <div className="validation-actions">
        <button className="btn btn-primary" onClick={runValidation}>
          ↻ Re-run Execution
        </button>
        <button
          className="btn btn-secondary"
          onClick={() =>
            navigate(`/capabilities/${encodeURIComponent(capabilityName ?? '')}/tools`)
          }
        >
          ← Back to Tools
        </button>
        <button className="btn btn-secondary" onClick={handleCopyResults}>
          📋 Copy Results
        </button>
      </div>

      {/* Session persistence banner */}
      <div className="session-banner">
        <span className="session-banner-icon">ℹ</span>
        Results saved to session — will be included in the consolidated validation report.
      </div>

      {/* Copy-to-clipboard toast */}
      {copyToast && <div className="copy-toast">✓ Results copied to clipboard</div>}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-component: single check item
// ---------------------------------------------------------------------------

interface CheckItemProps {
  check: ValidationCheck;
  index: number;
  expanded: boolean;
  onToggle: (index: number) => void;
}

function CheckItem({ check, index, expanded, onToggle }: CheckItemProps) {
  const hasFailed = !check.passed && !!check.error;

  const rowProps = hasFailed
    ? {
        role: 'button' as const,
        tabIndex: 0,
        onClick: () => onToggle(index),
        onKeyDown: (e: React.KeyboardEvent) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onToggle(index);
          }
        },
        'aria-expanded': expanded,
      }
    : {};

  return (
    <li className={`check-item${hasFailed ? ' expandable' : ''}`} role="listitem">
      <div className="check-item-row" {...rowProps}>
        <span className={`check-icon ${check.passed ? 'check-icon-pass' : 'check-icon-fail'}`}>
          {check.passed ? '✓' : '✕'}
        </span>
        <span className="check-label">{check.check}</span>
        <span className={`check-status ${check.passed ? 'check-status-pass' : 'check-status-fail'}`}>
          {check.passed ? 'PASS' : 'FAIL'}
        </span>
        {hasFailed && <span className={`chevron${expanded ? ' open' : ''}`}>▶</span>}
      </div>
      {hasFailed && expanded && (
        <div className="check-error-detail" role="alert">
          {check.error}
        </div>
      )}
    </li>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatResultsAsText(result: ValidationResult): string {
  const lines: string[] = [
    `Validation Results — ${result.toolName}`,
    `Overall: ${result.valid ? 'PASS' : 'FAIL'}`,
    `Passed: ${result.summary.passed}  Failed: ${result.summary.failed}`,
    `Timestamp: ${result.timestamp}`,
    '',
    'Checks:',
  ];

  for (const check of result.checks) {
    const icon = check.passed ? '✓' : '✕';
    lines.push(`  ${icon} ${check.check} — ${check.passed ? 'PASS' : 'FAIL'}`);
    if (!check.passed && check.error) {
      lines.push(`    Error: ${check.error}`);
    }
  }

  return lines.join('\n');
}
