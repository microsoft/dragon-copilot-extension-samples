import { describe, expect, it } from '@jest/globals';
import { readFileSync } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';
import {
  BODY_PART_CHOICES,
  CAPABILITY_CHOICES,
  DEFAULT_CAPABILITY,
  DEFAULT_OUTPUT_CONTENT_TYPE,
  DEFAULT_PAYLOAD_SCHEMA_VERSION,
  DEFAULT_TOOL_TYPE,
  INPUT_TYPE_CHOICES,
  MANIFEST_DEFAULTS,
  MODALITY_CHOICES,
  OUTPUT_TYPE_CHOICES,
  TOOL_TYPE_CHOICES,
} from '../domains/radiologists/manifest/index.js';
import type { ManifestChoice } from '../domains/radiologists/manifest/index.js';

/**
 * Parity guard between the two halves of manifest authoring.
 *
 * `manifest/choices.ts` decides what a user can *pick* (it drives the CLI prompts
 * and, via `/api/cli/options`, the Extensions Sandbox wizard). The manifest JSON
 * schema decides what is *accepted*. Neither is derived from the other, so they
 * are two independent copies of the same value lists and they can silently
 * disagree in either direction:
 *
 *  - a value added to the schema only  -> no surface ever offers it;
 *  - a value added to `choices.ts` only -> the wizard offers a choice that fails
 *    validation immediately after generation, with nothing explaining why.
 *
 * Both artifacts are owned by this package, so the mismatch is caught here
 * rather than in the sandbox, which merely syncs them in.
 *
 * Order is deliberately not asserted: the choice lists are ordered for humans
 * (body parts run head-to-foot), which is independent of the schema's order.
 */

// src/__tests__ -> src/schemas/radiologists
const SCHEMA_PATH = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  'schemas',
  'radiologists',
  'radiologists-extension-manifest-schema.json',
);

interface SchemaNode {
  enum?: string[];
  pattern?: string;
  properties?: Record<string, SchemaNode>;
}

interface ManifestSchema {
  properties: Record<string, SchemaNode>;
  definitions: Record<string, SchemaNode>;
}

const schema = JSON.parse(readFileSync(SCHEMA_PATH, 'utf-8')) as ManifestSchema;

/**
 * Reads an enum out of the schema, failing loudly if the definition was renamed
 * or restructured — otherwise a comparison against `undefined` could pass.
 */
function schemaEnum(definition: string, node: SchemaNode | undefined): string[] {
  if (!node?.enum || node.enum.length === 0) {
    throw new Error(
      `Schema definition '${definition}' has no enum. The manifest schema was restructured; ` +
      'update this parity test to match its new shape.',
    );
  }
  return node.enum;
}

/**
 * Reads a `pattern` out of the schema, failing loudly if it moved.
 */
function schemaPattern(location: string, node: SchemaNode | undefined): RegExp {
  if (!node?.pattern) {
    throw new Error(
      `Schema node '${location}' has no pattern. The manifest schema was restructured; ` +
      'update this parity test to match its new shape.',
    );
  }
  return new RegExp(node.pattern);
}

function choiceValues(choices: ReadonlyArray<ManifestChoice>): string[] {
  return choices.map((choice) => choice.value);
}

function sorted(values: readonly string[]): string[] {
  return [...values].sort();
}

const dragonTool = schema.definitions.DragonTool;

describe('choices ↔ manifest schema parity', () => {
  describe('selectable values cover exactly what the schema accepts', () => {
    it('offers every body part the schema allows, and no others', () => {
      expect(sorted(choiceValues(BODY_PART_CHOICES))).toEqual(
        sorted(schemaEnum('BodyPart', schema.definitions.BodyPart)),
      );
    });

    it('offers every imaging modality the schema allows, and no others', () => {
      expect(sorted(choiceValues(MODALITY_CHOICES))).toEqual(
        sorted(schemaEnum('DicomModality', schema.definitions.DicomModality)),
      );
    });

    it('offers every input content type the schema allows, and no others', () => {
      expect(sorted(choiceValues(INPUT_TYPE_CHOICES))).toEqual(
        sorted(schemaEnum('InputContentType', schema.definitions.InputContentType)),
      );
    });

    it('offers every output content type the schema allows, and no others', () => {
      expect(sorted(choiceValues(OUTPUT_TYPE_CHOICES))).toEqual(
        sorted(schemaEnum('OutputContentType', schema.definitions.OutputContentType)),
      );
    });

    it('offers every tool type the schema allows, and no others', () => {
      expect(sorted(choiceValues(TOOL_TYPE_CHOICES))).toEqual(
        sorted(schemaEnum('DragonTool.toolType', dragonTool?.properties?.toolType)),
      );
    });

    it('offers every capability the schema allows, and no others', () => {
      expect(sorted(choiceValues(CAPABILITY_CHOICES))).toEqual(
        sorted(schemaEnum('DragonTool.capability', dragonTool?.properties?.capability)),
      );
    });
  });

  describe('defaults are values the schema accepts', () => {
    it('defaults the tool type to an allowed value', () => {
      expect(schemaEnum('DragonTool.toolType', dragonTool?.properties?.toolType)).toContain(DEFAULT_TOOL_TYPE);
    });

    it('defaults the capability to an allowed value', () => {
      expect(schemaEnum('DragonTool.capability', dragonTool?.properties?.capability)).toContain(DEFAULT_CAPABILITY);
    });

    it('defaults the output content type to an allowed value', () => {
      expect(schemaEnum('OutputContentType', schema.definitions.OutputContentType)).toContain(
        DEFAULT_OUTPUT_CONTENT_TYPE,
      );
    });

    it('defaults the payload schema version to a well-formed major.minor', () => {
      expect(DEFAULT_PAYLOAD_SCHEMA_VERSION).toMatch(
        schemaPattern('PayloadSchemaVersion', schema.definitions.PayloadSchemaVersion),
      );
      expect(MANIFEST_DEFAULTS.schemaVersion).toMatch(
        schemaPattern('PayloadSchemaVersion', schema.definitions.PayloadSchemaVersion),
      );
    });

    it('offers extension and tool names the schema would accept', () => {
      // A default that fails validation would make the very first generated
      // manifest invalid for anyone who accepts the offered values.
      expect(MANIFEST_DEFAULTS.extensionName).toMatch(schemaPattern('name', schema.properties.name));
      expect(MANIFEST_DEFAULTS.toolName).toMatch(
        schemaPattern('DragonTool.name', dragonTool?.properties?.name),
      );
    });

    it('offers versions the schema would accept', () => {
      expect(MANIFEST_DEFAULTS.version).toMatch(schemaPattern('version', schema.properties.version));
      expect(MANIFEST_DEFAULTS.radiologistsExtensibilityApiVersion).toMatch(
        schemaPattern(
          'radiologistsExtensibilityApiVersion',
          schema.properties.radiologistsExtensibilityApiVersion,
        ),
      );
    });
  });

  describe('the choice lists are well-formed for the surfaces that render them', () => {
    const allLists: Array<[string, ReadonlyArray<ManifestChoice>]> = [
      ['BODY_PART_CHOICES', BODY_PART_CHOICES],
      ['MODALITY_CHOICES', MODALITY_CHOICES],
      ['INPUT_TYPE_CHOICES', INPUT_TYPE_CHOICES],
      ['OUTPUT_TYPE_CHOICES', OUTPUT_TYPE_CHOICES],
      ['TOOL_TYPE_CHOICES', TOOL_TYPE_CHOICES],
      ['CAPABILITY_CHOICES', CAPABILITY_CHOICES],
    ];

    it.each(allLists)('%s has no duplicate values', (_name, choices) => {
      const values = choiceValues(choices);
      expect(values).toHaveLength(new Set(values).size);
    });

    it.each(allLists)('%s labels every option', (_name, choices) => {
      // The sandbox dropdowns key off `name`; a blank one renders an unpickable row.
      for (const choice of choices) {
        expect(choice.name.trim()).not.toBe('');
      }
    });
  });
});
