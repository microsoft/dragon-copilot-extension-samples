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
  schema?: SchemaProperty;
}

interface FieldDefinition {
  path: string;
  label: string;
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
        // Guard against catastrophic backtracking with a length limit
        if (value.length <= 10_000 && !regex.test(value)) {
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
      {fields.map((field) => (
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
          label={field.description || field.label}
        />
      );

    case 'number':
      return (
        <Input
          type="number"
          value={value}
          onChange={(_, data) => onChange(field, data.value)}
          onBlur={() => onBlur(field)}
          placeholder={field.description || `Enter ${field.label}`}
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
          placeholder={field.description || `Enter ${field.label}`}
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
          placeholder={field.description || `Enter ${field.label}`}
          maxLength={field.constraints?.maxLength}
        />
      );
  }
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
          label: formatLabel(`${input.name} - ${propName}`),
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

function formatLabel(name: string): string {
  return name
    .replace(/([A-Z])/g, ' $1')
    .replace(/[._-]/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/^./, (s) => s.toUpperCase())
    .trim();
}

/** Returns all field paths that this set of inputs will generate. */
export function getFieldPaths(inputs: ToolInputSchema[]): string[] {
  return flattenInputsToFields(inputs).map((f) => f.path);
}
