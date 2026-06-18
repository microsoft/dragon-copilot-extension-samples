import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Button,
  Dropdown,
  Option,
  Tab,
  TabList,
  Spinner,
  Link,
} from '@fluentui/react-components';
import { PlayRegular, ArrowCounterclockwiseRegular, CodeRegular, CopyRegular } from '@fluentui/react-icons';
import { DynamicForm, getFieldPaths, SchemaProperty } from './DynamicForm';
import type { DynamicFormHandle } from './DynamicForm';
import './ValidationResults.css';

interface ToolInput {
  name: string;
  description: string;
  contentType: string;
  required: boolean;
  type?: string;
  placeholder?: string;
  schema?: SchemaProperty;
}

interface ToolOutput {
  name: string;
  contentType: string;
  description?: string;
}

interface Tool {
  name: string;
  description: string;
  endpoint: string;
  inputs: ToolInput[];
  outputs: ToolOutput[];
}

interface Capability {
  name: string;
  description: string;
  toolCount: number;
}

interface ManifestInfo {
  name: string;
  version: string;
  toolCount: number;
  capabilities: string[];
}

interface ExecuteResult {
  status: number;
  statusText: string;
  headers?: Record<string, string>;
  extensionResponse?: unknown;
  rawBody?: unknown;
  sentRequest?: unknown;
}

interface ExecuteErrorDetails {
  message: string;
  endpoint?: string;
  cause?: string;
  troubleshooting?: string[];
  sentRequest?: unknown;
}

interface ValidationCheck {
  check: string;
  passed: boolean;
  path?: string;
  error?: string;
}

interface ValidationResult {
  valid: boolean;
  toolName: string;
  outputContentType: string;
  checks: ValidationCheck[];
  summary: { passed: number; failed: number };
  timestamp: string;
}

interface InputValidationCheck {
  check: string;
  passed: boolean;
  path?: string;
  error?: string;
}

interface InputValidationError {
  valid: boolean;
  inputName: string;
  inputContentType: string;
  checks: InputValidationCheck[];
  summary: { passed: number; failed: number };
}

interface TestingPanelProps {
  manifestInfo: ManifestInfo | null;
  manifestRevision: number;
}

export function TestingPanel({ manifestInfo, manifestRevision }: TestingPanelProps) {
  const [activeTab, setActiveTab] = useState<string>('setup');
  const [capabilities, setCapabilities] = useState<Capability[]>([]);
  const [selectedCapability, setSelectedCapability] = useState<string>('');
  const [tools, setTools] = useState<Tool[]>([]);
  const [selectedTool, setSelectedTool] = useState<string>('');
  const [inputValues, setInputValues] = useState<Record<string, string>>({});
  const [isExecuting, setIsExecuting] = useState(false);
  const [result, setResult] = useState<ExecuteResult | null>(null);
  const [validationResult, setValidationResult] = useState<ValidationResult | null>(null);
  const [executionTimeMs, setExecutionTimeMs] = useState<number>(0);
  const [executeError, setExecuteError] = useState<ExecuteErrorDetails | null>(null);
  const [expandedChecks, setExpandedChecks] = useState<Set<number>>(new Set());
  const [copyToast, setCopyToast] = useState(false);
  const [inputValidationErrors, setInputValidationErrors] = useState<InputValidationError[] | null>(null);
  const formRef = useRef<DynamicFormHandle>(null);

  // Load capabilities when manifest is loaded
  useEffect(() => {
    if (!manifestInfo) {
      setCapabilities([]);
      setSelectedCapability('');
      setTools([]);
      setSelectedTool('');
      setInputValues({});
      setResult(null);
      setValidationResult(null);
      setExecuteError(null);
      setExpandedChecks(new Set());
      setInputValidationErrors(null);
      setActiveTab('setup');
      return;
    }

    // Reset state so the form is regenerated even if capability/tool names match
    setTools([]);
    setSelectedTool('');
    setInputValues({});
    setResult(null);
    setValidationResult(null);
    setExecuteError(null);
    setExpandedChecks(new Set());
    setInputValidationErrors(null);
    setActiveTab('setup');

    fetch('/api/manifest/capabilities')
      .then((res) => res.ok ? res.json() : [])
      .then((data: Capability[]) => {
        setCapabilities(data);
        if (data.length > 0) {
          setSelectedCapability(data[0].name);
        }
      })
      .catch(() => setCapabilities([]));
  }, [manifestInfo]);

  // Clear stale test/validation results whenever the manifest is edited.
  // This fires on every revision bump (including text edits before debounced
  // revalidation completes) so users never see results from a prior manifest.
  useEffect(() => {
    if (manifestRevision === 0) return; // skip initial mount
    setResult(null);
    setValidationResult(null);
    setExecuteError(null);
    setExpandedChecks(new Set());
    setInputValidationErrors(null);
  }, [manifestRevision]);

  // Load tools when capability or manifest changes
  useEffect(() => {
    if (!selectedCapability) {
      setTools([]);
      setSelectedTool('');
      return;
    }

    fetch(`/api/manifest/capabilities/${encodeURIComponent(selectedCapability)}/tools`)
      .then((res) => res.ok ? res.json() : [])
      .then((data: Tool[]) => {
        setTools(data);
        if (data.length > 0) {
          setSelectedTool(data[0].name);
        }
      })
      .catch(() => setTools([]));
  }, [selectedCapability, manifestInfo]);

  // Reset input values when tool changes
  useEffect(() => {
    const tool = tools.find((t) => t.name === selectedTool);
    if (tool) {
      const defaults: Record<string, string> = {};
      for (const path of getFieldPaths(tool.inputs)) {
        defaults[path] = '';
      }
      setInputValues(defaults);
    }
  }, [selectedTool, tools]);

  const currentTool = tools.find((t) => t.name === selectedTool);

  const handleInputChange = useCallback((name: string, value: string) => {
    setInputValues((prev) => ({ ...prev, [name]: value }));
  }, []);

  const handleResetInputs = useCallback(() => {
    if (currentTool) {
      const defaults: Record<string, string> = {};
      for (const path of getFieldPaths(currentTool.inputs)) {
        defaults[path] = '';
      }
      setInputValues(defaults);
    }
    setResult(null);
    setValidationResult(null);
    setExecuteError(null);
    setExpandedChecks(new Set());
    setInputValidationErrors(null);
  }, [currentTool]);

  const handleRunTest = useCallback(async () => {
    if (!selectedCapability || !selectedTool) return;

    // Validate form before executing
    if (formRef.current && !formRef.current.validate()) {
      return;
    }

    setIsExecuting(true);
    setResult(null);
    setValidationResult(null);
    setExecuteError(null);
    setExpandedChecks(new Set());
    setInputValidationErrors(null);

    // --- Input schema validation ---
    // Build the parsed inputs map (same logic as the server's parseInputValues)
    const parsedInputs: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(inputValues)) {
      const trimmed = value.trim();
      if ((trimmed.startsWith('{') && trimmed.endsWith('}')) ||
          (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
        try {
          parsedInputs[key] = JSON.parse(value);
        } catch {
          parsedInputs[key] = value;
        }
      } else {
        parsedInputs[key] = value;
      }
    }

    // Group flat field paths (e.g. "report.reportText") into nested objects by input name
    const groupedInputs: Record<string, unknown> = {};
    for (const [path, value] of Object.entries(parsedInputs)) {
      const dotIndex = path.indexOf('.');
      if (dotIndex > 0) {
        const inputName = path.slice(0, dotIndex);
        const fieldName = path.slice(dotIndex + 1);
        if (!groupedInputs[inputName] || typeof groupedInputs[inputName] !== 'object') {
          groupedInputs[inputName] = {};
        }
        // Only include non-empty values
        if (value !== '' && value !== null && value !== undefined) {
          (groupedInputs[inputName] as Record<string, unknown>)[fieldName] = value;
        }
      } else {
        // Flat input (no dot)
        if (value !== '' && value !== null && value !== undefined) {
          groupedInputs[path] = value;
        }
      }
    }

    try {
      const inputValRes = await fetch(`/api/validate/inputs/${encodeURIComponent(selectedTool)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inputs: groupedInputs }),
      });

      if (inputValRes.status === 422) {
        const inputValData = await inputValRes.json();
        const failedResults = (inputValData.results || []).filter((r: InputValidationError) => !r.valid);
        if (failedResults.length > 0) {
          setInputValidationErrors(failedResults);
          setIsExecuting(false);
          return;
        }
      }
    } catch {
      // If input validation endpoint is unreachable, proceed with execution anyway
    }

    const startTime = performance.now();

    try {
      const response = await fetch('/api/manifest/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          capability: selectedCapability,
          tool: selectedTool,
          inputs: inputValues,
        }),
      });

      const elapsedMs = Math.round(performance.now() - startTime);
      setExecutionTimeMs(elapsedMs);

      const data = await response.json();

      if (response.ok) {
        setResult(data);

        // Run validation on the response
        // outputs is a map keyed by output name (e.g. {"quality-result": {...}}) –
        // extract the first output's value for schema validation.
        const outputsMap = data.extensionResponse?.tools?.[0]?.outputs;
        const responsePayload = outputsMap
          ? Object.values(outputsMap)[0] ?? {}
          : data.rawBody ?? {};
        try {
          const valRes = await fetch(`/api/validate/${encodeURIComponent(selectedTool)}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ response: responsePayload }),
          });
          if (valRes.ok || valRes.status === 422) {
            const valData: ValidationResult = await valRes.json();
            setValidationResult(valData);
            // Auto-expand failed checks
            const failedIndices = new Set<number>();
            valData.checks.forEach((c, i) => {
              if (!c.passed && c.error) failedIndices.add(i);
            });
            setExpandedChecks(failedIndices);
          }
        } catch {
          // Validation call failed silently – results tab will show execution result only
        }
      } else {
        setExecuteError({
          message: data.error || `HTTP ${response.status}`,
          endpoint: data.endpoint,
          cause: data.cause,
          troubleshooting: data.troubleshooting,
          sentRequest: data.sentRequest,
        });
      }

      // Always switch to Results tab after execution
      setActiveTab('results');
    } catch {
      setExecutionTimeMs(Math.round(performance.now() - startTime));
      setExecuteError({
        message: 'Network error: could not reach the sandbox server.',
        cause: 'Sandbox server unreachable',
        troubleshooting: [
          'Ensure the sandbox development server is running.',
          'Check that the browser can reach the server on the expected port.',
        ],
      });
      setActiveTab('results');
    } finally {
      setIsExecuting(false);
    }
  }, [selectedCapability, selectedTool, inputValues]);

  const toggleCheck = useCallback((index: number) => {
    setExpandedChecks((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  }, []);

  const handleCopyResults = useCallback(() => {
    if (!validationResult) return;
    const lines: string[] = [
      `Validation Results — ${validationResult.toolName}`,
      `Overall: ${validationResult.valid ? 'PASS' : 'FAIL'}`,
      `Passed: ${validationResult.summary.passed}  Failed: ${validationResult.summary.failed}`,
      '',
      'Checks:',
    ];
    for (const check of validationResult.checks) {
      const icon = check.passed ? '✓' : '✕';
      lines.push(`  ${icon} ${check.check} — ${check.passed ? 'PASS' : 'FAIL'}`);
      if (!check.passed && check.error) {
        lines.push(`    Error: ${check.error}`);
      }
    }
    navigator.clipboard.writeText(lines.join('\n'))
      .then(() => {
        setCopyToast(true);
        setTimeout(() => setCopyToast(false), 2500);
      })
      .catch(() => { /* ignore */ });
  }, [validationResult]);

  if (!manifestInfo) {
    return (
      <div className="testing-panel">
        <h2 className="panel-title">Testing</h2>
        <div className="testing-empty">
          <p>Upload a manifest to begin testing tools.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="testing-panel">
      <h2 className="panel-title">Testing</h2>

      <TabList
        selectedValue={activeTab}
        onTabSelect={(_, data) => setActiveTab(data.value as string)}
      >
        <Tab value="setup">Setup</Tab>
        <Tab value="results">Results</Tab>
        <Tab value="outputs">Outputs</Tab>
      </TabList>

      <div className="tab-content">
        {activeTab === 'setup' && (
          <div className="setup-tab">
            <div className="manifest-info-line">
              Manifest: <strong>{manifestInfo.name}</strong> v{manifestInfo.version}
            </div>

            <div className="form-field">
              <label className="field-label">Capability</label>
              <Dropdown
                value={capabilities.find(c => c.name === selectedCapability)?.name || ''}
                selectedOptions={[selectedCapability]}
                onOptionSelect={(_, data) => {
                  setSelectedCapability(data.optionValue as string);
                  setResult(null);
                }}
              >
                {capabilities.map((cap) => (
                  <Option key={cap.name} value={cap.name}>
                    {cap.name}
                  </Option>
                ))}
              </Dropdown>
            </div>

            <div className="form-field">
              <label className="field-label">Tool</label>
              <Dropdown
                value={tools.find(t => t.name === selectedTool)?.name || ''}
                selectedOptions={[selectedTool]}
                onOptionSelect={(_, data) => {
                  setSelectedTool(data.optionValue as string);
                  setResult(null);
                }}
              >
                {tools.map((tool) => (
                  <Option key={tool.name} value={tool.name}>
                    {tool.name}
                  </Option>
                ))}
              </Dropdown>
              {currentTool && (
                <p className="field-description">{currentTool.description}</p>
              )}
            </div>

            <div className="form-field">
              <label className="field-label">Sample Scenario (Optional)</label>
              <div className="sample-scenario-row">
                <Dropdown
                  value="No sample loaded"
                  selectedOptions={['none']}
                  disabled
                >
                  <Option value="none">No sample loaded</Option>
                </Dropdown>
                <Link className="browse-link">Browse sample data packs</Link>
              </div>
              <p className="field-description">
                No sample loaded. You can fill fields manually or choose one of 3 sample scenarios.
              </p>
            </div>

            {currentTool && (
              <DynamicForm
                ref={formRef}
                inputs={currentTool.inputs}
                values={inputValues}
                onChange={handleInputChange}
              />
            )}

            <div className="action-bar">
              <Button
                appearance="primary"
                icon={<PlayRegular />}
                onClick={handleRunTest}
                disabled={isExecuting}
              >
                {isExecuting ? 'Running...' : 'Run Test'}
              </Button>
              <Button
                appearance="subtle"
                icon={<ArrowCounterclockwiseRegular />}
                onClick={handleResetInputs}
              >
                Reset Inputs
              </Button>
            </div>

            {isExecuting && (
              <div className="execute-loading">
                <Spinner size="small" label="Executing tool..." />
              </div>
            )}

            {executeError && (
              <div className="execute-error">
                <strong>Error:</strong> {executeError.message}
              </div>
            )}

            {inputValidationErrors && inputValidationErrors.length > 0 && (
              <div className="input-validation-errors" role="alert">
                <div className="input-validation-header">
                  <span className="error-icon">⚠️</span>
                  <strong>Input Schema Validation Failed</strong>
                </div>
                <p className="input-validation-summary">
                  The input data does not match the expected schema for the declared content-type(s). Fix the errors below before running the test.
                </p>
                {inputValidationErrors.map((inputErr, idx) => (
                  <div key={idx} className="input-validation-input-block">
                    <div className="input-validation-input-header">
                      <span className="check-icon check-icon-fail">✕</span>
                      <strong>{inputErr.inputName}</strong>
                      <code className="input-content-type-badge">{inputErr.inputContentType}</code>
                    </div>
                    <ul className="input-validation-check-list">
                      {inputErr.checks.filter(c => !c.passed).map((check, cIdx) => (
                        <li key={cIdx} className="input-validation-check-item">
                          <span className="check-icon check-icon-fail">✕</span>
                          <span className="input-validation-check-text">
                            {check.error || check.check}
                            {check.path && <code className="input-validation-path">{check.path}</code>}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'results' && (
          <div className="results-tab">
            {(result || executeError) ? (
              <div className="validation-results">
                {/* Tool context card */}
                <div className="tool-context">
                  <div className="tool-context-row">
                    <div>
                      <div className="tool-context-label">Capability</div>
                      <div className="tool-context-value">{selectedCapability}</div>
                    </div>
                    <div>
                      <div className="tool-context-label">Tool</div>
                      <div className="tool-context-value">{selectedTool}</div>
                    </div>
                    <div>
                      <div className="tool-context-label">Execution Time</div>
                      <div className="tool-context-value">{executionTimeMs} ms</div>
                    </div>
                  </div>
                </div>

                {/* Validation Results header */}
                {validationResult && (
                  <>
                    <div className="validation-header">
                      <h2>Validation Results</h2>
                      <span className={`badge ${validationResult.valid ? 'badge-pass' : 'badge-fail'}`}>
                        <span className="badge-icon">{validationResult.valid ? '✓' : '✕'}</span>
                        {validationResult.valid ? 'PASS' : 'FAIL'}
                      </span>
                    </div>

                    {/* Summary */}
                    <p className="validation-summary">
                      {validationResult.valid
                        ? `All ${validationResult.summary.passed} checks passed — response matches the expected schema.`
                        : `${validationResult.summary.failed} of ${validationResult.summary.passed + validationResult.summary.failed} checks failed — ${validationResult.checks.filter(c => !c.passed).map(c => c.error || c.check).join('; ')}`}
                    </p>

                    {/* Check list */}
                    <ul className="check-list" role="list" aria-label="Validation checks">
                      {validationResult.checks.map((check, index) => {
                        const hasFailed = !check.passed && !!check.error;
                        const expanded = expandedChecks.has(index);
                        return (
                          <li key={index} className={`check-item${hasFailed ? ' expandable' : ''}`} role="listitem">
                            <div
                              className="check-item-row"
                              {...(hasFailed ? {
                                role: 'button',
                                tabIndex: 0,
                                onClick: () => toggleCheck(index),
                                onKeyDown: (e: React.KeyboardEvent) => {
                                  if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    toggleCheck(index);
                                  }
                                },
                                'aria-expanded': expanded,
                              } : {})}
                            >
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
                      })}
                    </ul>
                  </>
                )}

                {/* Network/execution error (no validation result available) */}
                {executeError && !validationResult && (
                  <div className="execute-error-detailed" style={{ marginTop: '1rem' }}>
                    <div className="error-header">
                      <span className="error-icon">⚠️</span>
                      <strong>{executeError.cause || 'Error'}</strong>
                    </div>
                    <p className="error-message">{executeError.message}</p>
                    {executeError.endpoint && (
                      <p className="error-endpoint">
                        <strong>Endpoint:</strong>{' '}
                        <code>{executeError.endpoint}</code>
                      </p>
                    )}
                    {executeError.troubleshooting && executeError.troubleshooting.length > 0 && (
                      <div className="error-troubleshooting">
                        <strong>Troubleshooting:</strong>
                        <ul>
                          {executeError.troubleshooting.map((tip, i) => (
                            <li key={i}>{tip}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {!!executeError.sentRequest && (
                      <p className="error-outputs-hint">
                        <Link onClick={() => setActiveTab('outputs')}>
                          View request payload in Outputs tab →
                        </Link>
                      </p>
                    )}
                  </div>
                )}

                {/* Action buttons */}
                <div className="validation-actions">
                  <Button
                    appearance="primary"
                    icon={<CodeRegular />}
                    onClick={handleRunTest}
                    disabled={isExecuting}
                  >
                    Re-run Execution
                  </Button>
                  <Button
                    appearance="secondary"
                    icon={<CopyRegular />}
                    onClick={handleCopyResults}
                    disabled={!validationResult}
                  >
                    Copy Results
                  </Button>
                </div>

                {/* Session persistence banner */}
                {validationResult && (
                  <div className="session-banner">
                    <span className="session-banner-icon">ℹ</span>
                    Results saved to session - will be included in the consolidated validation report.
                  </div>
                )}
              </div>
            ) : (
              <p className="results-empty">No results yet. Run a test from the Setup tab.</p>
            )}

            {/* Copy-to-clipboard toast */}
            {copyToast && <div className="copy-toast" role="status" aria-live="polite">✓ Results copied to clipboard</div>}
          </div>
        )}

        {activeTab === 'outputs' && (
          <div className="outputs-tab">
            {result && currentTool ? (
              <div className="outputs-display">
                <h3 className="outputs-section-title">Request Payload</h3>
                <div className="request-method-badge">POST {currentTool.endpoint}</div>
                <pre className="dark-code-block">
                  {result.sentRequest
                    ? JSON.stringify(result.sentRequest, null, 2)
                    : JSON.stringify({ endpoint: currentTool.endpoint, payload: inputValues }, null, 2)}
                </pre>

                <h3 className="outputs-section-title">Response Payload</h3>
                <pre className="dark-code-block">
                  {result.extensionResponse
                    ? JSON.stringify(result.extensionResponse, null, 2)
                    : result.rawBody
                      ? (typeof result.rawBody === 'string' ? result.rawBody : JSON.stringify(result.rawBody, null, 2))
                      : 'No output data'}
                </pre>
              </div>
            ) : executeError ? (
              <div className="outputs-display">
                {!!executeError.sentRequest && (
                  <>
                    <h3 className="outputs-section-title">Request Payload</h3>
                    <div className="request-method-badge">POST {executeError.endpoint || ''}</div>
                    <pre className="dark-code-block">{JSON.stringify(executeError.sentRequest, null, 2)}</pre>
                  </>
                )}

                <h3 className="outputs-section-title">Response Payload <span className="sandbox-generated-label">(Sandbox-generated error context, not from extension)</span></h3>
                <pre className="dark-code-block">{JSON.stringify({
                  errorCode: executeError.cause?.toUpperCase().replace(/\s+/g, '_') || 'MISSING_REQUIRED_INPUT',
                  requiredMissing: Object.keys(inputValues).filter(k => !inputValues[k]),
                }, null, 2)}</pre>
              </div>
            ) : (
              <p className="results-empty">No outputs yet. Run a test from the Setup tab.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
