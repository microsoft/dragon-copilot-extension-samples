import { useState, useCallback, useMemo, useImperativeHandle, forwardRef } from 'react';
import {
  Input,
  Textarea,
  Dropdown,
  Option,
  Checkbox,
  Label,
  Badge,
} from '@fluentui/react-components';

export interface SchemaProperty {
  type?: string;
  description?: string;
  format?: string;
  enum?: string[];
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  required?: string[];
  properties?: Record<string, SchemaProperty>;
}

interface ToolInputSchema {
  name: string;
  description: string;
  contentType: string;
  required: boolean;
  schema?: SchemaProperty | null;
}

interface FieldDefinition {
  path: string;
  label: string;
  /** Display name of the input this field belongs to, used as a section heading. */
  group?: string;
  description: string;
  fieldType: 'text' | 'textarea' | 'number' | 'boolean' | 'dropdown' | 'date' | 'json';
  required: boolean;
  options?: string[];
  constraints?: {
    minimum?: number;
    maximum?: number;
    minLength?: number;
    maxLength?: number;
    pattern?: string;
  };
}

export interface DynamicFormHandle {
  validate: () => boolean;
}

interface FieldGroup {
  key: string;
  title: string | null;
  fields: FieldDefinition[];
}

interface DynamicFormProps {
  inputs: ToolInputSchema[];
  values: Record<string, string>;
  onChange: (name: string, value: string) => void;
  onValidationChange?: (isValid: boolean) => void;
}

export const DynamicForm = forwardRef<DynamicFormHandle, DynamicFormProps>(function DynamicForm(
  { inputs, values, onChange, onValidationChange },
  ref,
) {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  const fields = useMemo(() => flattenInputsToFields(inputs), [inputs]);
  const fieldGroups = useMemo(() => groupFields(fields), [fields]);

  const validateField = useCallback((field: FieldDefinition, value: string): string | null => {
    if (field.required && !value.trim()) {
      return `${field.label} is required`;
    }

    if (!value.trim()) return null;

    const { constraints } = field;
    if (!constraints) return null;

    if (field.fieldType === 'number') {
      const num = Number(value);
      if (isNaN(num)) return 'Must be a valid number';
      if (constraints.minimum !== undefined && num < constraints.minimum) {
        return `Must be at least ${constraints.minimum}`;
      }
      if (constraints.maximum !== undefined && num > constraints.maximum) {
        return `Must be at most ${constraints.maximum}`;
      }
    }

    if (constraints.minLength !== undefined && value.length < constraints.minLength) {
      return `Must be at least ${constraints.minLength} characters`;
    }
    if (constraints.maxLength !== undefined && value.length > constraints.maxLength) {
      return `Must be at most ${constraints.maxLength} characters`;
    }

    if (constraints.pattern) {
      try {
        const regex = new RegExp(constraints.pattern);
        // Reject patterns that are likely to cause catastrophic backtracking
        // (nested quantifiers like (a+)+, (a*)*b, etc.)
        const dangerousPattern = /(\(.+[+*]\).+[+*])/;
        if (dangerousPattern.test(constraints.pattern)) {
          // Skip pattern validation for potentially unsafe regex rather than
          // blocking the field. Running regex.test on such patterns risks ReDoS.
          console.warn(`Skipping pattern validation for potentially unsafe regex: ${constraints.pattern}`);
        } else if (value.length <= 10_000 && !regex.test(value)) {
          return `Must match pattern: ${constraints.pattern}`;
        }
      } catch {
        // Invalid regex pattern in schema, skip validation
      }
    }

    if (field.fieldType === 'json') {
      try {
        JSON.parse(value);
      } catch {
        return 'Must be valid JSON';
      }
    }

    return null;
  }, []);

  const handleBlur = useCallback((field: FieldDefinition) => {
    setTouched((prev) => ({ ...prev, [field.path]: true }));
    const value = values[field.path] || '';
    const error = validateField(field, value);
    setErrors((prev) => {
      const next = { ...prev };
      if (error) {
        next[field.path] = error;
      } else {
        delete next[field.path];
      }
      return next;
    });
  }, [values, validateField]);

  const handleChange = useCallback((field: FieldDefinition, value: string) => {
    onChange(field.path, value);

    // Re-validate if already touched
    if (touched[field.path]) {
      const error = validateField(field, value);
      setErrors((prev) => {
        const next = { ...prev };
        if (error) {
          next[field.path] = error;
        } else {
          delete next[field.path];
        }
        return next;
      });
    }
  }, [onChange, touched, validateField]);

  // Validate all fields and report
  const validateAll = useCallback((): boolean => {
    const newErrors: Record<string, string> = {};
    const newTouched: Record<string, boolean> = {};

    for (const field of fields) {
      newTouched[field.path] = true;
      const error = validateField(field, values[field.path] || '');
      if (error) {
        newErrors[field.path] = error;
      }
    }

    setTouched(newTouched);
    setErrors(newErrors);
    const isValid = Object.keys(newErrors).length === 0;
    onValidationChange?.(isValid);
    return isValid;
  }, [fields, values, validateField, onValidationChange]);

  useImperativeHandle(ref, () => ({ validate: validateAll }), [validateAll]);

  return (
    <div className="dynamic-form">
      {fieldGroups.map((group) => (
        <section key={group.key} className="dynamic-form-group">
          {group.title && <h4 className="dynamic-form-group-title">{group.title}</h4>}

          {group.fields.map((field) => (
            <div key={field.path} className="dynamic-form-field">
              <Label className="field-label" required={field.required}>
                {field.label}
                {field.fieldType !== 'text' && field.fieldType !== 'textarea' && (
                  <Badge appearance="outline" size="small" className="field-type-badge">
                    {field.fieldType}
                  </Badge>
                )}
              </Label>

              {renderFieldInput(field, values[field.path] || '', handleChange, handleBlur)}

              {field.description && (
                <p className="field-description">{field.description}</p>
              )}

              {touched[field.path] && errors[field.path] && (
                <p className="field-error">{errors[field.path]}</p>
              )}
            </div>
          ))}
        </section>
      ))}

      {fields.length === 0 && (
        <p className="dynamic-form-empty">This tool has no input parameters.</p>
      )}
    </div>
  );
});

function renderFieldInput(
  field: FieldDefinition,
  value: string,
  onChange: (field: FieldDefinition, value: string) => void,
  onBlur: (field: FieldDefinition) => void,
) {
  switch (field.fieldType) {
    case 'dropdown':
      return (
        <Dropdown
          value={value || ''}
          selectedOptions={value ? [value] : []}
          onOptionSelect={(_, data) => onChange(field, data.optionValue as string)}
          onBlur={() => onBlur(field)}
          placeholder={`Select ${field.label}`}
        >
          {field.options?.map((opt) => (
            <Option key={opt} value={opt}>{opt}</Option>
          ))}
        </Dropdown>
      );

    case 'boolean':
      return (
        <Checkbox
          checked={value === 'true'}
          onChange={(_, data) => onChange(field, data.checked ? 'true' : 'false')}
          aria-label={field.label}
        />
      );

    case 'number':
      return (
        <Input
          type="number"
          value={value}
          onChange={(_, data) => onChange(field, data.value)}
          onBlur={() => onBlur(field)}
          placeholder={inputPlaceholder(field)}
          min={field.constraints?.minimum}
          max={field.constraints?.maximum}
        />
      );

    case 'date':
      return (
        <Input
          type="date"
          value={value}
          onChange={(_, data) => onChange(field, data.value)}
          onBlur={() => onBlur(field)}
        />
      );

    case 'json':
      return (
        <Textarea
          value={value}
          onChange={(_, data) => onChange(field, data.value)}
          onBlur={() => onBlur(field)}
          placeholder={`{\n  "key": "value"\n}`}
          resize="vertical"
          rows={5}
          className="json-editor-field"
        />
      );

    case 'textarea':
      return (
        <Textarea
          value={value}
          onChange={(_, data) => onChange(field, data.value)}
          onBlur={() => onBlur(field)}
          placeholder={inputPlaceholder(field)}
          resize="vertical"
          rows={3}
        />
      );

    case 'text':
    default:
      return (
        <Input
          value={value}
          onChange={(_, data) => onChange(field, data.value)}
          onBlur={() => onBlur(field)}
          placeholder={inputPlaceholder(field)}
          maxLength={field.constraints?.maxLength}
        />
      );
  }
}

/** The description renders under the field, so it is not repeated as placeholder text. */
function inputPlaceholder(field: FieldDefinition): string | undefined {
  return field.description ? undefined : `Enter ${field.label}`;
}

/**
 * Flattens tool input schemas into a list of renderable field definitions.
 * If an input has a schema with properties, each property becomes its own field.
 * Otherwise the input itself becomes a single field.
 */
function flattenInputsToFields(inputs: ToolInputSchema[]): FieldDefinition[] {
  const fields: FieldDefinition[] = [];

  for (const input of inputs) {
    if (input.schema?.properties) {
      const requiredProps = input.schema.required || [];

      for (const [propName, propSchema] of Object.entries(input.schema.properties)) {
        fields.push({
          path: `${input.name}.${propName}`,
          label: formatLabel(propName),
          group: formatLabel(input.name),
          description: propSchema.description || '',
          fieldType: resolveFieldType(propSchema),
          required: input.required && requiredProps.includes(propName),
          options: propSchema.enum,
          constraints: {
            minimum: propSchema.minimum,
            maximum: propSchema.maximum,
            minLength: propSchema.minLength,
            maxLength: propSchema.maxLength,
            pattern: propSchema.pattern,
          },
        });
      }
    } else if (input.schema?.type === 'object' && !input.schema.properties) {
      // Object type without defined properties - render as JSON editor
      fields.push({
        path: input.name,
        label: formatLabel(input.name),
        description: input.description,
        fieldType: 'json',
        required: input.required,
      });
    } else {
      // Simple input without schema or with primitive schema
      fields.push({
        path: input.name,
        label: formatLabel(input.name),
        description: input.description,
        fieldType: resolveFieldTypeFromInput(input),
        required: input.required,
        constraints: input.schema ? {
          minimum: input.schema.minimum,
          maximum: input.schema.maximum,
          minLength: input.schema.minLength,
          maxLength: input.schema.maxLength,
          pattern: input.schema.pattern,
        } : undefined,
        options: input.schema?.enum,
      });
    }
  }

  return fields;
}

function resolveFieldType(schema: SchemaProperty): FieldDefinition['fieldType'] {
  if (schema.enum && schema.enum.length > 0) return 'dropdown';
  if (schema.format === 'date' || schema.format === 'date-time') return 'date';

  switch (schema.type) {
    case 'number':
    case 'integer':
      return 'number';
    case 'boolean':
      return 'boolean';
    case 'object':
      return 'json';
    case 'string':
      if (schema.maxLength && schema.maxLength > 200) return 'textarea';
      return 'text';
    default:
      return 'textarea';
  }
}

function resolveFieldTypeFromInput(input: ToolInputSchema): FieldDefinition['fieldType'] {
  if (input.schema) {
    return resolveFieldType(input.schema);
  }
  // Default to textarea for clinical content inputs
  if (input.contentType.includes('json')) return 'textarea';
  return 'textarea';
}

/** Lowercased inside a label unless they lead it, so 'dateOfBirth' reads 'Date of Birth'. */
const MINOR_WORDS = new Set([
  'a', 'an', 'and', 'as', 'at', 'by', 'for', 'in', 'of', 'on', 'or', 'the', 'to', 'with',
]);

/**
 * Turns an identifier into a human-readable label.
 * 'reportText' -> 'Report Text', 'dateOfBirth' -> 'Date of Birth', 'patientID' -> 'Patient ID'.
 */
function formatLabel(name: string): string {
  const words = name
    .replace(/[._\-\s]+/g, ' ')
    // Split camelCase/PascalCase boundaries while keeping acronym runs together:
    // 'dateOfBirth' -> 'date Of Birth', 'patientID' -> 'patient ID', 'idcURL' -> 'idc URL'
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .replace(/([a-zA-Z])(\d)/g, '$1 $2')
    .split(' ')
    .filter(Boolean);

  return words
    .map((word, index) => {
      // Preserve acronyms as authored (ID, URL, FHIR)
      if (word.length > 1 && word === word.toUpperCase()) return word;

      const lower = word.toLowerCase();
      if (index > 0 && MINOR_WORDS.has(lower)) return lower;
      return lower.charAt(0).toUpperCase() + lower.slice(1);
    })
    .join(' ');
}

/** Groups fields by their originating input, preserving first-appearance order. */
function groupFields(fields: FieldDefinition[]): FieldGroup[] {
  const groups: FieldGroup[] = [];
  const byKey = new Map<string, FieldGroup>();

  for (const field of fields) {
    const key = field.group ?? '';
    let group = byKey.get(key);
    if (!group) {
      group = { key: key || '__ungrouped__', title: field.group ?? null, fields: [] };
      byKey.set(key, group);
      groups.push(group);
    }
    group.fields.push(field);
  }

  return groups;
}

/** Returns all field paths that this set of inputs will generate. */
export function getFieldPaths(inputs: ToolInputSchema[]): string[] {
  return flattenInputsToFields(inputs).map((f) => f.path);
}
