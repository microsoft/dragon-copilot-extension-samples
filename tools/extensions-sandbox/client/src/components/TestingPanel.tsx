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
import { PlayRegular, ArrowCounterclockwiseRegular } from '@fluentui/react-icons';
import { DynamicForm, getFieldPaths, SchemaProperty } from './DynamicForm';
import type { DynamicFormHandle } from './DynamicForm';

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
  body: unknown;
}

interface TestingPanelProps {
  manifestInfo: ManifestInfo | null;
}

export function TestingPanel({ manifestInfo }: TestingPanelProps) {
  const [activeTab, setActiveTab] = useState<string>('setup');
  const [capabilities, setCapabilities] = useState<Capability[]>([]);
  const [selectedCapability, setSelectedCapability] = useState<string>('');
  const [tools, setTools] = useState<Tool[]>([]);
  const [selectedTool, setSelectedTool] = useState<string>('');
  const [inputValues, setInputValues] = useState<Record<string, string>>({});
  const [isExecuting, setIsExecuting] = useState(false);
  const [result, setResult] = useState<ExecuteResult | null>(null);
  const [executeError, setExecuteError] = useState<string | null>(null);
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
      return;
    }

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

  // Load tools when capability changes
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
  }, [selectedCapability]);

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
    setExecuteError(null);
  }, [currentTool]);

  const handleRunTest = useCallback(async () => {
    if (!selectedCapability || !selectedTool) return;

    // Validate form before executing
    if (formRef.current && !formRef.current.validate()) {
      return;
    }

    setIsExecuting(true);
    setResult(null);
    setExecuteError(null);

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

      const data = await response.json();

      if (response.ok) {
        setResult(data);
        setActiveTab('results');
      } else {
        setExecuteError(data.error || `HTTP ${response.status}`);
      }
    } catch {
      setExecuteError('Network error: could not reach the server.');
    } finally {
      setIsExecuting(false);
    }
  }, [selectedCapability, selectedTool, inputValues]);

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
                <strong>Error:</strong> {executeError}
              </div>
            )}
          </div>
        )}

        {activeTab === 'results' && (
          <div className="results-tab">
            {result ? (
              <div className="result-display">
                <div className="result-status">
                  <span className={`status-badge ${result.status < 400 ? 'status-success' : 'status-error'}`}>
                    {result.status} {result.statusText}
                  </span>
                </div>
                <div className="result-body">
                  <pre className="result-json">
                    {typeof result.body === 'string'
                      ? result.body
                      : JSON.stringify(result.body, null, 2)}
                  </pre>
                </div>
              </div>
            ) : (
              <p className="results-empty">No results yet. Run a test from the Setup tab.</p>
            )}
          </div>
        )}

        {activeTab === 'outputs' && (
          <div className="outputs-tab">
            {result && currentTool ? (
              <div className="outputs-display">
                {currentTool.outputs.map((output) => (
                  <div key={output.name} className="output-item">
                    <label className="field-label">{output.name}</label>
                    <p className="field-description">Content-Type: {output.contentType}</p>
                    {output.description && <p className="field-description">{output.description}</p>}
                  </div>
                ))}
                <pre className="result-json">
                  {typeof result.body === 'string'
                    ? result.body
                    : JSON.stringify(result.body, null, 2)}
                </pre>
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
