import { useState, useCallback, useRef } from 'react';
import { FluentProvider, webLightTheme } from '@fluentui/react-components';
import { ManifestEditor } from './components/ManifestEditor';
import { TestingPanel } from './components/TestingPanel';

interface ManifestInfo {
  name: string;
  version: string;
  toolCount: number;
  capabilities: string[];
}

function App() {
  const [manifestInfo, setManifestInfo] = useState<ManifestInfo | null>(null);
  // Revision counter to force TestingPanel to clear stale results even when
  // ManifestInfo fields are structurally identical (e.g. only endpoint changed).
  const revisionRef = useRef(0);
  const [manifestRevision, setManifestRevision] = useState(0);

  const handleManifestLoaded = useCallback((info: ManifestInfo) => {
    revisionRef.current += 1;
    setManifestRevision(revisionRef.current);
    setManifestInfo(info);
  }, []);

  const handleReset = useCallback(() => {
    revisionRef.current += 1;
    setManifestRevision(revisionRef.current);
    setManifestInfo(null);
  }, []);

  // Called immediately when user edits manifest text, before debounced validation.
  // Invalidates stale test results so the UI doesn't show old pass/fail state.
  const handleManifestEditing = useCallback(() => {
    revisionRef.current += 1;
    setManifestRevision(revisionRef.current);
  }, []);

  return (
    <FluentProvider theme={webLightTheme}>
      <div className="app">
        <header className="app-header">
          <div className="header-content">
            <div className="header-logo">
              <img src="/dragon-copilot-logo.png" alt="Dragon Copilot" width="32" height="32" />
            </div>
            <div className="header-text">
              <h1>Dragon Copilot Radiology Extensions Sandbox</h1>
              <p className="subtitle">Test and validate your extensions before deployment</p>
            </div>
          </div>
        </header>

        <main className="app-main">
          <div className="panel-left">
            <ManifestEditor
              onManifestLoaded={handleManifestLoaded}
              onManifestEditing={handleManifestEditing}
              onReset={handleReset}
            />
          </div>
          <div className="panel-right">
            <TestingPanel manifestInfo={manifestInfo} manifestRevision={manifestRevision} />
          </div>
        </main>
      </div>
    </FluentProvider>
  );
}

export default App;
