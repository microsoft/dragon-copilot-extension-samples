import { useState, useCallback, useRef, useEffect } from 'react';
import {
  Button,
  Badge,
  Tooltip,
  Spinner,
} from '@fluentui/react-components';
import {
  ArrowUploadRegular,
  ArrowCounterclockwiseRegular,
  CodeRegular,
} from '@fluentui/react-icons';

interface ValidationError {
  path: string | null;
  line?: number | null;
  message: string;
  detail?: string;
  hint?: string;
  severity: string;
}

interface ManifestInfo {
  name: string;
  version: string;
  toolCount: number;
  capabilities: string[];
}

interface ManifestEditorProps {
  onManifestLoaded: (info: ManifestInfo) => void;
  onManifestEditing: () => void;
  onReset: () => void;
}

export function ManifestEditor({ onManifestLoaded, onManifestEditing, onReset }: ManifestEditorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [manifestText, setManifestText] = useState<string>('');
  const [isValid, setIsValid] = useState<boolean | null>(null);
  const [validationMessage, setValidationMessage] = useState<string>('');
  const [errors, setErrors] = useState<ValidationError[]>([]);

  // Auto-resize textarea to fit content
  useEffect(() => {
    const ta = textareaRef.current;
    if (ta) {
      ta.style.height = 'auto';
      ta.style.height = `${ta.scrollHeight}px`;
    }
  }, [manifestText]);

  const uploadFile = useCallback(async (file: File) => {
    setIsUploading(true);
    setErrors([]);

    const formData = new FormData();
    formData.append('manifest', file);

    try {
      const response = await fetch('/api/manifest/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await response.json();

      if (data.valid) {
        setIsValid(true);
        setValidationMessage('Manifest is valid and ready for sandbox testing.');
        onManifestLoaded(data.manifest);
        // Fetch raw text to display in editor
        const rawRes = await fetch('/api/manifest/raw');
        if (rawRes.ok) {
          const rawData = await rawRes.json();
          setManifestText(rawData.content);
        }
      } else {
        setIsValid(false);
        setValidationMessage(data.message);
        setErrors(data.errors || []);
        // Show the manifest content even when invalid
        if (data.rawContent) {
          setManifestText(data.rawContent);
        }
      }
    } catch {
      setIsValid(false);
      setValidationMessage('Network error: could not reach the server.');
      setErrors([{ path: null, message: 'Network error', severity: 'error' }]);
    } finally {
      setIsUploading(false);
    }
  }, [onManifestLoaded]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadFile(file);
    if (e.target) e.target.value = '';
  }, [uploadFile]);

  const handleUploadClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleReset = useCallback(() => {
    setManifestText('');
    setIsValid(null);
    setValidationMessage('');
    setErrors([]);
    fetch('/api/manifest', { method: 'DELETE' });
    onReset();
  }, [onReset]);

  // Track whether the text was changed by the user (not by upload)
  const isUserEdit = useRef(false);

  const handleTextChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setManifestText(e.target.value);
    isUserEdit.current = true;
    onManifestEditing();
  }, [onManifestEditing]);

  // Debounced re-validation on text changes
  useEffect(() => {
    if (!isUserEdit.current) return;
    isUserEdit.current = false;

    if (!manifestText.trim()) {
      setIsValid(null);
      setValidationMessage('');
      setErrors([]);
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const response = await fetch('/api/manifest/validate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: manifestText }),
          signal: controller.signal,
        });
        if (controller.signal.aborted) return;
        const data = await response.json();

        if (data.valid) {
          setIsValid(true);
          setValidationMessage(data.message);
          setErrors([]);
          onManifestLoaded(data.manifest);
        } else {
          setIsValid(false);
          setValidationMessage(data.message);
          setErrors(data.errors || []);
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        setIsValid(false);
        setValidationMessage('Network error: could not reach the server.');
        setErrors([{ path: null, message: 'Network error', severity: 'error' }]);
      }
    }, 800);

    return () => { clearTimeout(timer); controller.abort(); };
  }, [manifestText, onManifestLoaded]);

  const lines = manifestText.split('\n');

  return (
    <div className="manifest-editor">
      <h2 className="panel-title">Manifest Editor</h2>
      <p className="panel-description">
        Upload your extension manifest file (.json, .yaml, .yml) to begin testing, or use the CLI tool to create a manifest.
      </p>

      <div className="editor-toolbar">
        <Button
          appearance="primary"
          icon={<ArrowUploadRegular />}
          onClick={handleUploadClick}
        >
          Upload Manifest
        </Button>
        {/* TODO: Re-enable when CLI integration (story #2848832) is complete */}
        <Tooltip content="Coming Soon - CLI integration in progress" relationship="description">
          <span>
            <Button
              appearance="secondary"
              icon={<CodeRegular />}
              disabled
            >
              Dragon Copilot CLI
            </Button>
          </span>
        </Tooltip>
        <Button
          appearance="subtle"
          icon={<ArrowCounterclockwiseRegular />}
          onClick={handleReset}
        >
          Reset Session
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json,.yaml,.yml"
          onChange={handleFileSelect}
          className="file-input-hidden"
          aria-hidden="true"
        />
      </div>

      {isUploading && (
        <div className="editor-loading">
          <Spinner size="small" label="Validating manifest..." />
        </div>
      )}

      <div className="manifest-label">Manifest (YAML or JSON)</div>
      <div className="code-editor">
        <div className="code-editor-gutter">
          {lines.length > 0 && manifestText ? (
            lines.map((_, i) => (
              <div key={i} className="line-number">{i + 1}</div>
            ))
          ) : (
            <div className="line-number">1</div>
          )}
        </div>
        <div className="code-editor-content">
          <textarea
            ref={textareaRef}
            className="code-textarea"
            value={manifestText}
            onChange={handleTextChange}
            placeholder="No manifest loaded. Upload a file or paste content here."
            spellCheck={false}
          />
        </div>
      </div>

      <div className="manifest-validation">
        <span className="validation-title">Manifest Validation</span>
        {isValid === true && (
          <Badge appearance="filled" color="success">✓ Valid</Badge>
        )}
        {isValid === false && (
          <Badge appearance="filled" color="danger">✗ Invalid</Badge>
        )}
        {isValid === null && (
          <Badge appearance="filled" color="informative">Awaiting upload</Badge>
        )}
      </div>
      {validationMessage && (
        <p className={`validation-message ${isValid ? 'valid' : 'invalid'}`}>
          {validationMessage}
        </p>
      )}
      {errors.length > 0 && (
        <ul className="validation-errors">
          {errors.map((err, i) => (
            <li key={i} className="validation-error-item">
              {err.line && <code className="error-line">Line {err.line}</code>}
              {err.path && <code className="error-path">{err.path}</code>}
              <span>{err.detail || err.message}</span>
              {err.hint && <span className="error-hint">Fix: {err.hint}</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
