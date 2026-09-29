import { useState, useCallback, useRef, useEffect } from 'react';
import {
  Button,
  Badge,
  Spinner,
} from '@fluentui/react-components';
import {
  ArrowUploadRegular,
  ArrowCounterclockwiseRegular,
  CodeRegular,
  CheckmarkRegular,
} from '@fluentui/react-icons';
import { EditorView, lineNumbers, placeholder as cmPlaceholder } from '@codemirror/view';
import { EditorState, Compartment } from '@codemirror/state';
import { json } from '@codemirror/lang-json';
import { yaml } from '@codemirror/lang-yaml';
import { syntaxHighlighting, defaultHighlightStyle } from '@codemirror/language';
import { CliWizardDialog } from './CliWizardDialog';

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

// Detect whether content looks like JSON (starts with '{' or '[')
function detectLanguage(text: string) {
  const trimmed = text.trimStart();
  return trimmed.startsWith('{') || trimmed.startsWith('[') ? json() : yaml();
}

const editorTheme = EditorView.theme({
  '&': {
    fontSize: '12px',
    minHeight: '350px',
    maxHeight: '500px',
    fontFamily: "'Cascadia Code', Consolas, monospace",
  },
  '.cm-content': {
    padding: '10px 0',
    fontFamily: "'Cascadia Code', Consolas, monospace",
    lineHeight: '20px',
  },
  '.cm-line': {
    padding: '0 10px',
  },
  '.cm-gutters': {
    background: 'rgb(244, 248, 255)',
    color: 'var(--color-text-secondary)',
    borderRight: '1px solid var(--color-border-subtle)',
    minWidth: '56px',
    fontFamily: "'Cascadia Code', Consolas, monospace",
    fontSize: '12px',
    lineHeight: '20px',
  },
  '.cm-lineNumbers .cm-gutterElement': {
    padding: '0 8px 0 0',
    textAlign: 'right',
  },
  '.cm-scroller': {
    overflow: 'auto',
    maxHeight: '500px',
  },
  '&.cm-focused': {
    outline: 'none',
  },
  '.cm-placeholder': {
    color: '#999',
    fontStyle: 'italic',
  },
});

export function ManifestEditor({ onManifestLoaded, onManifestEditing, onReset }: ManifestEditorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const editorContainerRef = useRef<HTMLDivElement>(null);
  const editorViewRef = useRef<EditorView | null>(null);
  const langCompartment = useRef(new Compartment());
  const [isUploading, setIsUploading] = useState(false);
  const [manifestText, setManifestText] = useState<string>('');
  const [isValid, setIsValid] = useState<boolean | null>(null);
  const [validationMessage, setValidationMessage] = useState<string>('');
  const [errors, setErrors] = useState<ValidationError[]>([]);
  const [isValidating, setIsValidating] = useState(false);
  const [isCliWizardOpen, setIsCliWizardOpen] = useState(false);

  // Stable refs for callbacks used inside CodeMirror listener
  const onManifestEditingRef = useRef(onManifestEditing);
  onManifestEditingRef.current = onManifestEditing;

  // Set while upload/reset writes into the editor, so those programmatic
  // transactions are not treated as user edits (which would wipe the validation
  // state the upload handler just set).
  const isProgrammaticUpdate = useRef(false);

  // Initialize CodeMirror
  useEffect(() => {
    if (!editorContainerRef.current) return;

    const state = EditorState.create({
      doc: '',
      extensions: [
        lineNumbers(),
        langCompartment.current.of(yaml()),
        syntaxHighlighting(defaultHighlightStyle, { fallback: true }),
        editorTheme,
        cmPlaceholder('No manifest loaded. Upload a file or paste content here.'),
        EditorView.updateListener.of((update) => {
          if (!update.docChanged) return;

          setManifestText(update.state.doc.toString());
          if (isProgrammaticUpdate.current) return;

          setIsValid(null);
          setValidationMessage('');
          setErrors([]);
          onManifestEditingRef.current();
        }),
        EditorView.lineWrapping,
      ],
    });

    const view = new EditorView({ state, parent: editorContainerRef.current });
    editorViewRef.current = view;

    return () => {
      view.destroy();
      editorViewRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Sync programmatic text changes (upload/reset) into CodeMirror
  const setEditorContent = useCallback((text: string) => {
    const view = editorViewRef.current;
    if (!view) return;

    const currentText = view.state.doc.toString();
    if (currentText === text) return;

    // Replace content and switch language in one transaction
    isProgrammaticUpdate.current = true;
    try {
      view.dispatch({
        changes: { from: 0, to: currentText.length, insert: text },
      });

      // Reconfigure language based on content
      view.dispatch({
        effects: langCompartment.current.reconfigure(detectLanguage(text)),
      });
    } finally {
      isProgrammaticUpdate.current = false;
    }
  }, []);

  const uploadFile = useCallback(async (file: File) => {
    setIsUploading(true);
    setErrors([]);
    setIsValid(null);
    setValidationMessage('');
    // A new manifest invalidates whatever was validated before, so close the
    // Testing panel until the user validates this one.
    onReset();

    const formData = new FormData();
    formData.append('manifest', file);

    try {
      const response = await fetch('/api/manifest/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await response.json();

      if (!response.ok) {
        // Upload rejected (parse failure or schema validation failure) — surface
        // the server's diagnosis instead of silently swapping in the raw text.
        setIsValid(false);
        setErrors(data.errors ?? [{ path: null, message: 'Upload failed', severity: 'error' }]);
        setValidationMessage(data.message ?? 'Manifest upload failed.');
        if (data.rawContent) {
          setManifestText(data.rawContent);
          setEditorContent(data.rawContent);
        }
        return;
      }

      // Upload succeeded, but the Testing panel stays gated behind an explicit
      // Validate click, so no validation state is published here. Only the
      // canonical stored text is pulled back into the editor.
      const rawRes = await fetch('/api/manifest/raw');
      if (rawRes.ok) {
        const rawData = await rawRes.json();
        setManifestText(rawData.content);
        setEditorContent(rawData.content);
      } else if (data.rawContent) {
        setManifestText(data.rawContent);
        setEditorContent(data.rawContent);
      }
    } catch {
      setIsValid(false);
      setValidationMessage('Network error: could not reach the server.');
      setErrors([{ path: null, message: 'Network error', severity: 'error' }]);
    } finally {
      setIsUploading(false);
    }
  }, [setEditorContent, onReset]);

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
    setEditorContent('');
    setIsValid(null);
    setValidationMessage('');
    setErrors([]);
    fetch('/api/manifest', { method: 'DELETE' });
    onReset();
  }, [onReset, setEditorContent]);

  // Validates a specific manifest string against the schema and publishes the
  // result. Takes the content explicitly so the CLI wizard can validate the YAML
  // it just wrote without waiting for editor state to catch up.
  const validateContent = useCallback(async (content: string) => {
    if (!content.trim()) return;

    setIsValidating(true);
    // Clear the whole previous verdict, not just the errors: leaving isValid set
    // would show the old manifest's badge over content that has not been checked
    // yet — visible when the CLI wizard swaps in a new manifest mid-flight.
    setIsValid(null);
    setValidationMessage('');
    setErrors([]);

    try {
      const response = await fetch('/api/manifest/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      });
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
    } catch {
      setIsValid(false);
      setValidationMessage('Network error: could not reach the server.');
      setErrors([{ path: null, message: 'Network error', severity: 'error' }]);
    } finally {
      setIsValidating(false);
    }
  }, [onManifestLoaded]);

  // User-initiated validation via "Validate" button
  const handleValidate = useCallback(() => {
    void validateContent(manifestText);
  }, [manifestText, validateContent]);

  // Manifest produced by the CLI wizard: replace the editor contents and validate
  // it straight away, so the user lands on the same state as an uploaded manifest.
  const handleCliGenerated = useCallback((generatedYaml: string) => {
    // A new manifest invalidates whatever was validated before.
    onReset();
    setManifestText(generatedYaml);
    setEditorContent(generatedYaml);
    void validateContent(generatedYaml);
  }, [onReset, setEditorContent, validateContent]);

  return (
    <div className="manifest-editor">
      <h2 className="panel-title">Manifest Editor</h2>
      <p className="panel-description">
        Upload your extension manifest file (.json, .yaml, .yml) to begin testing, or click Generate Manifest to create one with the CLI wizard.
      </p>

      <div className="editor-toolbar">
        <Button
          appearance="secondary"
          icon={<ArrowUploadRegular />}
          onClick={handleUploadClick}
        >
          Upload Manifest
        </Button>
        {/* Runs the CLI's manifest generation server-side (POST /api/cli/generate). */}
        <Button
          appearance="secondary"
          icon={<CodeRegular />}
          onClick={() => setIsCliWizardOpen(true)}
        >
          Generate Manifest
        </Button>
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

      <CliWizardDialog
        open={isCliWizardOpen}
        onOpenChange={setIsCliWizardOpen}
        onGenerated={handleCliGenerated}
      />

      {isUploading && (
        <div className="editor-loading">
          <Spinner size="small" label="Loading manifest..." />
        </div>
      )}

      <div className="manifest-label">Manifest (YAML or JSON)</div>
      <div className="code-editor" ref={editorContainerRef} />

      <div className="editor-actions-bottom">
        <div className="editor-actions-left">
          <Button
            appearance="primary"
            icon={<CheckmarkRegular />}
            onClick={handleValidate}
            disabled={!manifestText.trim() || isValidating}
          >
            {isValidating ? 'Validating...' : 'Validate'}
          </Button>
        </div>
        <div className="editor-actions-right">
          <div className="manifest-validation">
            <span className="validation-title">Manifest Validation</span>
            {isValid === true && (
              <Badge appearance="filled" color="success">✓ Valid</Badge>
            )}
            {isValid === false && (
              <Badge appearance="filled" color="danger">✗ Invalid</Badge>
            )}
            {isValid === null && !manifestText.trim() && (
              <Badge appearance="filled" color="informative">Awaiting upload</Badge>
            )}
            {isValid === null && manifestText.trim() && (
              <Badge appearance="filled" color="informative">Not validated</Badge>
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
      </div>
    </div>
  );
}
