import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';

interface Capability {
  name: string;
  description: string;
  toolCount: number;
}

export function CapabilityList() {
  const navigate = useNavigate();
  const [capabilities, setCapabilities] = useState<Capability[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/manifest/capabilities', { signal: controller.signal })
      .then((res) => {
        if (res.status === 404) {
          throw new Error('No manifest loaded. Please upload a manifest first.');
        }
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data: Capability[]) => setCapabilities(data))
      .catch((err) => {
        if (err.name !== 'AbortError') {
          setError(err.message || 'Failed to load capabilities.');
        }
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, []);

  const handleSelect = (name: string) => {
    navigate(`/capabilities/${encodeURIComponent(name)}/tools`);
  };

  if (loading) {
    return (
      <div className="capability-list">
        <h2>Capabilities</h2>
        <div className="capability-loading">
          <span className="spinner" /> Loading capabilities...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="capability-list">
        <h2>Capabilities</h2>
        <div className="capability-error">
          <p>{error}</p>
          <Link to="/upload" className="btn btn-primary">
            Upload Manifest →
          </Link>
        </div>
      </div>
    );
  }

  if (capabilities.length === 0) {
    return (
      <div className="capability-list">
        <h2>Capabilities</h2>
        <div className="capability-empty">
          <p>No capabilities found in manifest.</p>
          <Link to="/upload" className="btn btn-secondary btn-back">
            ← Back to Upload
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="capability-list">
      <h2>Capabilities</h2>
      <p className="capability-description">
        Select a capability to view its associated tools.
      </p>
      <ul className="capability-items" role="list" aria-label="Extension capabilities">
        {capabilities.map((cap) => (
          <li key={cap.name} className="capability-card" role="listitem">
            <button
              type="button"
              className="capability-card-button"
              onClick={() => handleSelect(cap.name)}
            >
              <div className="capability-card-header">
                <span className="capability-name">{cap.name}</span>
                <span className="capability-tool-count">
                  {cap.toolCount} {cap.toolCount === 1 ? 'tool' : 'tools'}
                </span>
              </div>
              <p className="capability-card-description">{cap.description}</p>
            </button>
          </li>
        ))}
      </ul>
      <Link to="/upload" className="btn btn-secondary btn-back">
        ← Back to Upload
      </Link>
    </div>
  );
}
