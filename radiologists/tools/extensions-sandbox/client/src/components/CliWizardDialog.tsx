import { useCallback, useEffect, useState } from 'react';
import {
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogBody,
  DialogContent,
  DialogSurface,
  DialogTitle,
  Dropdown,
  Field,
  Input,
  MessageBar,
  MessageBarBody,
  Option,
  Radio,
  RadioGroup,
  Spinner,
  Textarea,
} from '@fluentui/react-components';

interface Choice {
  name: string;
  value: string;
}

interface TemplateSummary {
  id: string;
  name: string;
  description: string;
  version: string;
  toolCount: number;
}

interface CliOptions {
  templates: TemplateSummary[];
  inputTypes: Choice[];
  bodyParts: Choice[];
  modalities: Choice[];
  outputContentType: string;
  defaults: {
    extensionName: string;
    extensionDescription: string;
    version: string;
    radiologistsExtensibilityApiVersion: string;
    toolName: string;
    toolDescription: string;
    endpoint: string;
    outputName: string;
    outputDescription: string;
    schemaVersion: string;
  };
}

interface CliWizardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called with the generated YAML so the editor can load and validate it. */
  onGenerated: (yaml: string) => void;
}

type Mode = 'template' | 'custom';

/**
 * Runs the Dragon Copilot CLI's manifest wizard from the Manifest Editor.
 *
 * The CLI asks its questions on a TTY, which the browser has no equivalent for,
 * so this dialog collects the same answers as a form and posts them to
 * `/api/cli/generate`, where the CLI's own manifest code assembles the YAML.
 * Field choices and defaults come from `/api/cli/options` rather than being
 * duplicated here, so the two surfaces cannot drift apart.
 */
export function CliWizardDialog({ open, onOpenChange, onGenerated }: CliWizardDialogProps) {
  const [options, setOptions] = useState<CliOptions | null>(null);
  const [optionsError, setOptionsError] = useState<string>('');
  const [mode, setMode] = useState<Mode>('template');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string>('');

  const [template, setTemplate] = useState<string>('');
  const [tenantId, setTenantId] = useState<string>('');

  const [extensionName, setExtensionName] = useState<string>('');
  const [extensionDescription, setExtensionDescription] = useState<string>('');
  const [version, setVersion] = useState<string>('');
  const [apiVersion, setApiVersion] = useState<string>('');

  const [toolName, setToolName] = useState<string>('');
  const [toolDescription, setToolDescription] = useState<string>('');
  const [endpoint, setEndpoint] = useState<string>('');
  const [inputTypes, setInputTypes] = useState<string[]>([]);
  const [outputName, setOutputName] = useState<string>('');
  const [outputDescription, setOutputDescription] = useState<string>('');
  const [schemaVersion, setSchemaVersion] = useState<string>('');
  const [bodyParts, setBodyParts] = useState<string[]>([]);
  const [modalities, setModalities] = useState<string[]>([]);

  // Load the wizard's choices and defaults the first time it is opened.
  useEffect(() => {
    if (!open || options) return;

    let cancelled = false;
    (async () => {
      try {
        const response = await fetch('/api/cli/options');
        if (!response.ok) throw new Error(`Request failed with status ${response.status}`);
        const data: CliOptions = await response.json();
        if (cancelled) return;

        setOptions(data);
        setOptionsError('');
        setTemplate(data.templates[0]?.id ?? '');
        setExtensionName(data.defaults.extensionName);
        setExtensionDescription(data.defaults.extensionDescription);
        setVersion(data.defaults.version);
        setApiVersion(data.defaults.radiologistsExtensibilityApiVersion);
        setToolName(data.defaults.toolName);
        setToolDescription(data.defaults.toolDescription);
        setEndpoint(data.defaults.endpoint);
        setInputTypes(data.inputTypes.map((choice) => choice.value));
        setOutputName(data.defaults.outputName);
        setOutputDescription(data.defaults.outputDescription);
        setSchemaVersion(data.defaults.schemaVersion);
      } catch {
        if (!cancelled) setOptionsError('Could not load the CLI wizard options. Is the sandbox server running?');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [open, options]);

  // Drop the previous attempt's failure so reopening the wizard starts clean.
  useEffect(() => {
    if (!open) setError('');
  }, [open]);

  const toggleInputType = useCallback((value: string, checked: boolean) => {
    setInputTypes((current) =>
      checked ? [...new Set([...current, value])] : current.filter((item) => item !== value),
    );
  }, []);

  const buildRequestBody = useCallback(() => {
    if (mode === 'template') {
      return { domain: 'radiologists', mode, template, tenantId };
    }

    return {
      domain: 'radiologists',
      mode,
      tenantId,
      extension: {
        name: extensionName,
        description: extensionDescription,
        version,
        radiologistsExtensibilityApiVersion: apiVersion,
      },
      tool: {
        name: toolName,
        description: toolDescription,
        endpoint,
        inputTypes,
        outputs: [{ name: outputName, description: outputDescription, schemaVersion }],
        relevanceFilteringCriteria: { relevantBodyParts: bodyParts, relevantModalities: modalities },
      },
    };
  }, [
    apiVersion, bodyParts, endpoint, extensionDescription, extensionName, inputTypes, modalities,
    mode, outputDescription, outputName, schemaVersion, template, tenantId, toolDescription, toolName, version,
  ]);

  const handleGenerate = useCallback(async () => {
    setIsGenerating(true);
    setError('');

    try {
      const response = await fetch('/api/cli/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildRequestBody()),
      });
      const data = await response.json();

      // A malformed request produces no manifest, so the wizard stays open with
      // the reason. A schema-invalid manifest still comes back as YAML: it is
      // loaded into the editor, which reports the errors in place.
      if (!data.yaml) {
        setError(data.message ?? 'Manifest generation failed.');
        return;
      }

      onGenerated(data.yaml);
      onOpenChange(false);
    } catch {
      setError('Network error: could not reach the server.');
    } finally {
      setIsGenerating(false);
    }
  }, [buildRequestBody, onGenerated, onOpenChange]);

  // Gate on every field the form marks `required`, so the button's enabled state
  // matches what the form asks for. Blank values would otherwise reach the server
  // and come back as a 422 (or be quietly replaced by a default) instead of being
  // caught while the user is still looking at the field.
  const hasRequiredCustomFields =
    extensionName.trim() &&
    extensionDescription.trim() &&
    version.trim() &&
    apiVersion.trim() &&
    toolName.trim() &&
    toolDescription.trim() &&
    endpoint.trim() &&
    inputTypes.length > 0 &&
    outputName.trim() &&
    outputDescription.trim() &&
    schemaVersion.trim();

  const canGenerate = Boolean(
    options && tenantId.trim() && (mode === 'template' ? template : hasRequiredCustomFields),
  );

  return (
    <Dialog open={open} onOpenChange={(_event, data) => onOpenChange(data.open)}>
      <DialogSurface className="cli-wizard-surface">
        <DialogBody>
          <DialogTitle>Create a manifest with the Dragon Copilot CLI</DialogTitle>
          <DialogContent>
            <p className="cli-wizard-intro">
              Answers the same questions as <code>dragon-copilot radiologists init</code>. The manifest is
              generated by the CLI and loaded straight into the editor for validation and testing.
            </p>

            {optionsError && (
              <MessageBar intent="error">
                <MessageBarBody>{optionsError}</MessageBarBody>
              </MessageBar>
            )}

            {!options && !optionsError && <Spinner size="small" label="Loading CLI options..." />}

            {options && (
              <div className="cli-wizard-form">
                <Field label="Start from">
                  <RadioGroup value={mode} onChange={(_event, data) => setMode(data.value as Mode)} layout="horizontal">
                    <Radio value="template" label="A built-in template" />
                    <Radio value="custom" label="My own values" />
                  </RadioGroup>
                </Field>

                {mode === 'template' && (
                  <Field label="Template" required>
                    <Dropdown
                      value={options.templates.find((item) => item.id === template)?.description ?? ''}
                      selectedOptions={template ? [template] : []}
                      onOptionSelect={(_event, data) => setTemplate(data.optionValue ?? '')}
                    >
                      {options.templates.map((item) => (
                        <Option key={item.id} value={item.id} text={item.description}>
                          {item.description}
                        </Option>
                      ))}
                    </Dropdown>
                  </Field>
                )}

                <Field
                  label="Azure Entra ID tenant ID"
                  required
                  hint="The tenant your extension is deployed to, in GUID format."
                >
                  <Input
                    value={tenantId}
                    placeholder="12345678-1234-1234-1234-123456789abc"
                    onChange={(_event, data) => setTenantId(data.value)}
                  />
                </Field>

                {mode === 'custom' && (
                  <>
                    <div className="cli-wizard-section">Extension</div>

                    <Field label="Name" required hint="camelCase, e.g. myRadiologistsExtension.">
                      <Input value={extensionName} onChange={(_event, data) => setExtensionName(data.value)} />
                    </Field>

                    <Field label="Description" required>
                      <Textarea
                        value={extensionDescription}
                        rows={2}
                        onChange={(_event, data) => setExtensionDescription(data.value)}
                      />
                    </Field>

                    <div className="cli-wizard-row">
                      <Field label="Version" required hint="x.y.z">
                        <Input value={version} onChange={(_event, data) => setVersion(data.value)} />
                      </Field>
                      <Field label="Extensibility API version" required hint="x.y.z">
                        <Input value={apiVersion} onChange={(_event, data) => setApiVersion(data.value)} />
                      </Field>
                    </div>

                    <div className="cli-wizard-section">Tool</div>

                    <Field label="Name" required hint="camelCase, e.g. myRadiologistsTool.">
                      <Input value={toolName} onChange={(_event, data) => setToolName(data.value)} />
                    </Field>

                    <Field label="Description" required>
                      <Textarea
                        value={toolDescription}
                        rows={2}
                        onChange={(_event, data) => setToolDescription(data.value)}
                      />
                    </Field>

                    <Field label="API endpoint" required hint="The HTTPS URL Dragon Copilot calls.">
                      <Input value={endpoint} onChange={(_event, data) => setEndpoint(data.value)} />
                    </Field>

                    <Field label="Input data types" required hint="Select at least one.">
                      <div className="cli-wizard-checkboxes">
                        {options.inputTypes.map((choice) => (
                          <Checkbox
                            key={choice.value}
                            label={choice.name}
                            checked={inputTypes.includes(choice.value)}
                            onChange={(_event, data) => toggleInputType(choice.value, Boolean(data.checked))}
                          />
                        ))}
                      </div>
                    </Field>

                    <div className="cli-wizard-row">
                      <Field label="Output name" required>
                        <Input value={outputName} onChange={(_event, data) => setOutputName(data.value)} />
                      </Field>
                      <Field label="Output payload schemaVersion" required hint="major.minor">
                        <Input value={schemaVersion} onChange={(_event, data) => setSchemaVersion(data.value)} />
                      </Field>
                    </div>

                    <Field label="Output description" required>
                      <Input value={outputDescription} onChange={(_event, data) => setOutputDescription(data.value)} />
                    </Field>

                    <div className="cli-wizard-section">Relevance filtering (optional)</div>
                    <p className="cli-wizard-hint">
                      Limits when the tool is considered. Leave both empty to always consider it.
                    </p>

                    <div className="cli-wizard-row">
                      <Field label="Body parts">
                        <Dropdown
                          multiselect
                          placeholder="Any body part"
                          selectedOptions={bodyParts}
                          value={bodyParts
                            .map((value) => options.bodyParts.find((choice) => choice.value === value)?.name ?? value)
                            .join(', ')}
                          onOptionSelect={(_event, data) => setBodyParts(data.selectedOptions)}
                        >
                          {options.bodyParts.map((choice) => (
                            <Option key={choice.value} value={choice.value} text={choice.name}>
                              {choice.name}
                            </Option>
                          ))}
                        </Dropdown>
                      </Field>
                      <Field label="Imaging modalities">
                        <Dropdown
                          multiselect
                          placeholder="Any modality"
                          selectedOptions={modalities}
                          value={modalities
                            .map((value) => options.modalities.find((choice) => choice.value === value)?.name ?? value)
                            .join(', ')}
                          onOptionSelect={(_event, data) => setModalities(data.selectedOptions)}
                        >
                          {options.modalities.map((choice) => (
                            <Option key={choice.value} value={choice.value} text={choice.name}>
                              {choice.name}
                            </Option>
                          ))}
                        </Dropdown>
                      </Field>
                    </div>
                  </>
                )}

                {error && (
                  <MessageBar intent="error">
                    <MessageBarBody>{error}</MessageBarBody>
                  </MessageBar>
                )}
              </div>
            )}
          </DialogContent>
          <DialogActions>
            <Button appearance="secondary" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button appearance="primary" onClick={handleGenerate} disabled={!canGenerate || isGenerating}>
              {isGenerating ? 'Generating...' : 'Generate manifest'}
            </Button>
          </DialogActions>
        </DialogBody>
      </DialogSurface>
    </Dialog>
  );
}
