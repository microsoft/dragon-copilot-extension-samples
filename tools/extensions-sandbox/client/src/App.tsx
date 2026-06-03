import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { ManifestUpload } from './components/ManifestUpload';
import { CapabilityList } from './components/CapabilityList';
import './components/ManifestUpload.css';
import './components/CapabilityList.css';

function HomePage() {
  const [status, setStatus] = useState<string>('checking...');

  useEffect(() => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    fetch('/api/health', { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => setStatus(data.status))
      .catch(() => setStatus('unavailable'))
      .finally(() => clearTimeout(timeout));
  }, []);

  return (
    <main className="app-main">
      <section className="status-card">
        <h2>Server Status</h2>
        <p className={`status ${status === 'ok' ? 'status-ok' : 'status-error'}`}>
          {status === 'ok' ? '● Connected' : `● ${status}`}
        </p>
      </section>
      <section className="info-card">
        <h2>Getting Started</h2>
        <p>
          <Link to="/upload" className="btn btn-primary">
            Upload Manifest →
          </Link>
        </p>
      </section>
    </main>
  );
}

function UploadPage() {
  return (
    <main className="app-main app-main-single">
      <ManifestUpload />
    </main>
  );
}

function CapabilitiesPage() {
  return (
    <main className="app-main app-main-single">
      <CapabilityList />
    </main>
  );
}

function CapabilityToolsPage() {
  return (
    <main className="app-main app-main-single">
      <div className="info-card">
        <h2>Capability Tools</h2>
        <p>Tool listing for this capability is coming soon.</p>
        <Link to="/capabilities" className="btn btn-secondary btn-back">
          ← Back to Capabilities
        </Link>
      </div>
    </main>
  );
}

function App() {
  return (
    <BrowserRouter>
      <div className="app">
        <header className="app-header">
          <Link to="/" style={{ color: 'inherit', textDecoration: 'none' }}>
            <h1>Dragon Copilot Extensions Sandbox</h1>
          </Link>
          <p className="subtitle">
            Test and validate your extensions locally before deployment
          </p>
        </header>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/upload" element={<UploadPage />} />
          <Route path="/capabilities" element={<CapabilitiesPage />} />
          <Route path="/capabilities/:name/tools" element={<CapabilityToolsPage />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
