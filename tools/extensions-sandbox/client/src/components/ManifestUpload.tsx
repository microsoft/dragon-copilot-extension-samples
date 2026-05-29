import { useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

interface ValidationError {
  path: string | null;
  line?: number | null;
  message: string;
  detail?: string;
  hint?: string;
  severity: string;
}

interface UploadSuccessResponse {
  valid: true;
  manifest: {
    name: string;
    version: string;
    toolCount: number;
    capabilities: string[];
  };
  message: string;
}

interface UploadErrorResponse {
  valid: false;
  errors: ValidationError[];
  message: string;
}

type UploadResponse = UploadSuccessResponse | UploadErrorResponse;

export function ManifestUpload() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [result, setResult] = useState<UploadResponse | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  const uploadFile = useCallback(async (file: File) => {
    setIsUploading(true);
    setResult(null);
    setFileName(file.name);

    const formData = new FormData();
    formData.append('manifest', file);

    try {
      const response = await fetch('/api/manifest/upload', {
        method: 'POST',
        body: formData,
      });
      const data: UploadResponse = await response.json();
      setResult(data);
    } catch {
      setResult({
        valid: false,
        errors: [{ path: null, message: 'Network error: could not reach the server.', severity: 'error' }],
        message: 'Upload failed due to a network error.',
      });
    } finally {
      setIsUploading(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) uploadFile(file);
  }, [uploadFile]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadFile(file);
  }, [uploadFile]);

  const handleBrowseClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  return (
    <div className="manifest-upload">
      <h2>Upload Extension Manifest</h2>
      <p className="upload-description">
        Upload your extension manifest file (.json, .yaml, .yml) to validate its structure
        and begin testing your tools.
      </p>

      <div
        className={`drop-zone ${isDragging ? 'drop-zone-active' : ''}`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={handleBrowseClick}
        role="button"
        tabIndex={0}
        aria-label="Upload manifest file"
      >
        <div className="drop-zone-content">
          <span className="drop-zone-icon">📄</span>
          <p className="drop-zone-text">
            {isDragging ? 'Drop your manifest here' : 'Drag & drop your manifest file here'}
          </p>
          <p className="drop-zone-hint">or click to browse</p>
          <p className="drop-zone-formats">Accepted: .json, .yaml, .yml (max 1MB)</p>
        </div>
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
        <div className="upload-status uploading">
          <span className="spinner" /> Validating {fileName}...
        </div>
      )}

      {result && result.valid && (
        <div className="upload-result success">
          <div className="result-banner success-banner">
            <span className="result-icon">✓</span>
            <span>{result.message}</span>
          </div>
          <div className="manifest-summary">
            <p><strong>Name:</strong> {result.manifest.name}</p>
            <p><strong>Version:</strong> {result.manifest.version}</p>
            <p><strong>Tools:</strong> {result.manifest.toolCount}</p>
            <p><strong>Capabilities:</strong> {result.manifest.capabilities.join(', ')}</p>
          </div>
          <button
            className="btn btn-primary"
            onClick={() => navigate('/capabilities')}
          >
            Proceed to Capability Explorer →
          </button>
        </div>
      )}

      {result && !result.valid && (
        <div className="upload-result error">
          <div className="result-banner error-banner">
            <span className="result-icon">✗</span>
            <span>{result.message}</span>
          </div>
          <ul className="error-list">
            {result.errors.map((err, i) => (
              <li key={i} className="error-item">
                <span className="error-location">
                  {err.line && <code className="error-line">Line {err.line}</code>}
                  {err.path && <code className="error-path">{err.path}</code>}
                </span>
                <span className="error-message">{err.detail || err.message}</span>
                {err.hint && (
                  <div className="error-hint">
                    <strong>Fix: </strong>{err.hint}
                  </div>
                )}
              </li>
            ))}
          </ul>
          <button className="btn btn-secondary" onClick={handleBrowseClick}>
            Upload a different file
          </button>
        </div>
      )}
    </div>
  );
}
