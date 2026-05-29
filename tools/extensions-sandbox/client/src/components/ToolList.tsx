import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';

interface ToolInput {
  name: string;
  description: string;
  contentType: string;
  required: boolean;
}

interface ToolOutput {
  name: string;
  contentType: string;
}

interface Tool {
  name: string;
  description: string;
  endpoint: string;
  inputs: ToolInput[];
  outputs: ToolOutput[];
}

export function ToolList() {
  const { capabilityName } = useParams<{ capabilityName: string }>();
  const navigate = useNavigate();
  const [tools, setTools] = useState<Tool[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTool, setSelectedTool] = useState<string | null>(null);

  useEffect(() => {
    if (!capabilityName) return;
    const controller = new AbortController();

    fetch(`/api/manifest/capabilities/${encodeURIComponent(capabilityName)}/tools`, {
      signal: controller.signal,
    })
      .then((res) => {
        if (res.status === 404) {
          return res.json().then((data) => {
            throw new Error(data.error || 'Not found');
          });
        }
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data: Tool[]) => setTools(data))
      .catch((err) => {
        if (err.name !== 'AbortError') {
          setError(err.message || 'Failed to load tools.');
        }
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [capabilityName]);

  const handleSelect = (toolName: string) => {
    setSelectedTool(toolName);
    navigate(`/capabilities/${encodeURIComponent(capabilityName!)}/tools/${encodeURIComponent(toolName)}/execute`);
  };

  if (loading) {
    return (
      <div className="tool-list">
        <h2>Tools — {capabilityName}</h2>
        <div className="tool-loading">
          <span className="spinner" /> Loading tools...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="tool-list">
        <h2>Tools</h2>
        <div className="tool-error">
          <p>{error}</p>
          <Link to="/capabilities" className="btn btn-secondary btn-back">
            ← Back to Capabilities
          </Link>
        </div>
      </div>
    );
  }

  if (tools.length === 0) {
    return (
      <div className="tool-list">
        <h2>Tools — {capabilityName}</h2>
        <div className="tool-empty">
          <p>No tools defined for this capability.</p>
          <Link to="/capabilities" className="btn btn-secondary btn-back">
            ← Back to Capabilities
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="tool-list">
      <h2>Tools — {capabilityName}</h2>
      <p className="tool-list-description">
        Select a tool to test its execution.
      </p>
      <ul className="tool-items" role="listbox" aria-label="Capability tools">
        {tools.map((tool) => (
          <li
            key={tool.name}
            className={`tool-card ${selectedTool === tool.name ? 'tool-card-selected' : ''}`}
            role="option"
            aria-selected={selectedTool === tool.name}
            tabIndex={0}
            onClick={() => handleSelect(tool.name)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleSelect(tool.name);
              }
            }}
          >
            <div className="tool-card-header">
              <span className="tool-name">{tool.name}</span>
              <span className="tool-input-count">
                {tool.inputs.length} {tool.inputs.length === 1 ? 'input' : 'inputs'}
              </span>
            </div>
            <p className="tool-card-description">{tool.description}</p>
            <div className="tool-card-meta">
              {tool.inputs.map((input) => (
                <span key={input.name} className="tool-input-badge">
                  {input.name}{input.required ? ' *' : ''}
                </span>
              ))}
            </div>
          </li>
        ))}
      </ul>
      <Link to="/capabilities" className="btn btn-secondary btn-back">
        ← Back to Capabilities
      </Link>
    </div>
  );
}
