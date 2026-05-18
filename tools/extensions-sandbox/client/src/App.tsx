import { useEffect, useState } from 'react';

function App() {
  const [status, setStatus] = useState<string>('checking...');

  useEffect(() => {
    fetch('/api/health')
      .then((res) => res.json())
      .then((data) => setStatus(data.status))
      .catch(() => setStatus('unavailable'));
  }, []);

  return (
    <div className="app">
      <header className="app-header">
        <h1>Dragon Copilot Extensions Sandbox</h1>
        <p className="subtitle">
          Test and validate your extensions locally before deployment
        </p>
      </header>
      <main className="app-main">
        <section className="status-card">
          <h2>Server Status</h2>
          <p className={`status ${status === 'ok' ? 'status-ok' : 'status-error'}`}>
            {status === 'ok' ? '● Connected' : `● ${status}`}
          </p>
        </section>
        <section className="info-card">
          <h2>Getting Started</h2>
          <p>Upload an extension manifest to begin testing your tools and capabilities.</p>
        </section>
      </main>
    </div>
  );
}

export default App;
