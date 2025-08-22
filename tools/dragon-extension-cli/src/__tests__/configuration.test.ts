import {
  validateHeaderName,
  validateConfigLabel,
  validateConfigDescription,
  promptConfigurationItem,
  promptExtensionConfiguration
} from '../shared/prompts.js';
import { DragonConfiguration } from '../types.js';

// Mock the inquirer prompts
jest.mock('@inquirer/prompts', () => ({
  input: jest.fn(),
  confirm: jest.fn(),
  checkbox: jest.fn(),
  select: jest.fn(),
}));

import { input, confirm } from '@inquirer/prompts';

const mockInput = input as jest.MockedFunction<typeof input>;
const mockConfirm = confirm as jest.MockedFunction<typeof confirm>;

describe('Configuration Prompts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('validateHeaderName', () => {
    test('should accept valid header names', () => {
      expect(validateHeaderName('x-dre-api-key')).toBe(true);
      expect(validateHeaderName('x-dre-API-KEY')).toBe(true);
      expect(validateHeaderName('x-dre-ApiKey')).toBe(true);
      expect(validateHeaderName('x-dre-organization-id')).toBe(true);
      expect(validateHeaderName('x-dre-test-123')).toBe(true);
      expect(validateHeaderName('x-dre-env')).toBe(true);
    });

    test('should reject header names not starting with x-dre-', () => {
      expect(validateHeaderName('api-key')).toBe('Header name must start with "x-dre-"');
      expect(validateHeaderName('dre-api-key')).toBe('Header name must start with "x-dre-"');
      expect(validateHeaderName('x-api-key')).toBe('Header name must start with "x-dre-"');
    });

    test('should reject header names that are too short or too long', () => {
      expect(validateHeaderName('x-dre-')).toBe('Header name must be between 7 and 64 characters');
      expect(validateHeaderName('x-dre-' + 'a'.repeat(60))).toBe('Header name must be between 7 and 64 characters');
    });

    test('should reject header names with invalid characters', () => {
      expect(validateHeaderName('x-dre-API-KEY')).toBe(true); // uppercase is now allowed
      expect(validateHeaderName('x-dre-api_key')).toBe('Header name can only contain letters, numbers, and hyphens after "x-dre-"');
      expect(validateHeaderName('x-dre-api.key')).toBe('Header name can only contain letters, numbers, and hyphens after "x-dre-"');
    });

    test('should reject empty header names', () => {
      expect(validateHeaderName('')).toBe('Header name is required');
      expect(validateHeaderName('   ')).toBe('Header name is required');
    });
  });

  describe('validateConfigLabel', () => {
    test('should accept valid labels', () => {
      expect(validateConfigLabel('API Key')).toBe(true);
      expect(validateConfigLabel('Organization ID')).toBe(true);
      expect(validateConfigLabel('Environment')).toBe(true);
    });

    test('should reject empty labels', () => {
      expect(validateConfigLabel('')).toBe('Label is required');
      expect(validateConfigLabel('   ')).toBe('Label is required');
    });

    test('should reject labels that are too long', () => {
      const longLabel = 'a'.repeat(31);
      expect(validateConfigLabel(longLabel)).toBe('Label must be 30 characters or less');
    });

    test('should accept labels at the character limit', () => {
      const maxLabel = 'a'.repeat(30);
      expect(validateConfigLabel(maxLabel)).toBe(true);
    });
  });

  describe('validateConfigDescription', () => {
    test('should accept valid descriptions', () => {
      expect(validateConfigDescription('Your organization API key')).toBe(true);
      expect(validateConfigDescription('Environment configuration setting')).toBe(true);
    });

    test('should reject empty descriptions', () => {
      expect(validateConfigDescription('')).toBe('Description is required');
      expect(validateConfigDescription('   ')).toBe('Description is required');
    });

    test('should reject descriptions that are too long', () => {
      const longDescription = 'a'.repeat(101);
      expect(validateConfigDescription(longDescription)).toBe('Description must be 100 characters or less');
    });

    test('should accept descriptions at the character limit', () => {
      const maxDescription = 'a'.repeat(100);
      expect(validateConfigDescription(maxDescription)).toBe(true);
    });
  });

  describe('promptConfigurationItem', () => {
    test('should prompt for configuration item and return valid configuration', async () => {
      mockInput
        .mockResolvedValueOnce('API Key')           // label
        .mockResolvedValueOnce('Your API key')     // description
        .mockResolvedValueOnce('x-dre-api-key');   // header

      const result = await promptConfigurationItem();

      expect(result).toEqual({
        label: 'API Key',
        description: 'Your API key',
        header: 'x-dre-api-key'
      });

      expect(mockInput).toHaveBeenCalledTimes(3);
    });

    test('should generate default header from label', async () => {
      mockInput
        .mockResolvedValueOnce('Organization ID')
        .mockResolvedValueOnce('Your organization identifier')
        .mockResolvedValueOnce('x-dre-organization-id');

      await promptConfigurationItem();

      // Check that the header input was called with a default based on the label
      expect(mockInput).toHaveBeenNthCalledWith(3, expect.objectContaining({
        default: 'x-dre-organization-id'
      }));
    });

    test('should validate against existing configurations to prevent duplicates', async () => {
      const existingConfigs: DragonConfiguration[] = [
        { label: 'API Key', description: 'Existing API key', header: 'x-dre-api-key' }
      ];

      mockInput
        .mockResolvedValueOnce('Environment')
        .mockResolvedValueOnce('Environment setting')
        .mockResolvedValueOnce('x-dre-environment');

      await promptConfigurationItem(existingConfigs);

      // The validator function should check for duplicates
      const headerCall = mockInput.mock.calls[2][0];
      const headerValidator = headerCall.validate;
      expect(headerValidator).toBeDefined();
      if (headerValidator) {
        expect(headerValidator('x-dre-api-key')).toBe('Header name already exists in this extension');
        expect(headerValidator('x-dre-environment')).toBe(true);
      }
    });
  });

  describe('promptExtensionConfiguration', () => {
    test('should return empty array when user chooses not to add configuration', async () => {
      mockConfirm.mockResolvedValueOnce(false);

      const result = await promptExtensionConfiguration();

      expect(result).toEqual([]);
      expect(mockConfirm).toHaveBeenCalledWith(expect.objectContaining({
        message: 'Add configuration values for this extension?',
        default: false
      }));
    });

    test('should allow adding single configuration item', async () => {
      mockConfirm
        .mockResolvedValueOnce(true)    // Add configuration?
        .mockResolvedValueOnce(false);  // Add another?

      mockInput
        .mockResolvedValueOnce('API Key')
        .mockResolvedValueOnce('Your API key')
        .mockResolvedValueOnce('x-dre-api-key');

      const result = await promptExtensionConfiguration();

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        label: 'API Key',
        description: 'Your API key',
        header: 'x-dre-api-key'
      });
    });

    test('should allow adding multiple configuration items', async () => {
      mockConfirm
        .mockResolvedValueOnce(true)    // Add configuration?
        .mockResolvedValueOnce(true)    // Add another?
        .mockResolvedValueOnce(false);  // Add another?

      mockInput
        .mockResolvedValueOnce('API Key')
        .mockResolvedValueOnce('Your API key')
        .mockResolvedValueOnce('x-dre-api-key')
        .mockResolvedValueOnce('Environment')
        .mockResolvedValueOnce('Environment setting')
        .mockResolvedValueOnce('x-dre-environment');

      const result = await promptExtensionConfiguration();

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        label: 'API Key',
        description: 'Your API key',
        header: 'x-dre-api-key'
      });
      expect(result[1]).toEqual({
        label: 'Environment',
        description: 'Environment setting',
        header: 'x-dre-environment'
      });
    });

    test('should limit to maximum of 10 configuration items', async () => {
      // Set up 10 confirmations for adding configuration
      mockConfirm.mockResolvedValue(true);

      // Set up input mocks for 10 configuration items
      for (let i = 1; i <= 10; i++) {
        mockInput
          .mockResolvedValueOnce(`Config ${i}`)
          .mockResolvedValueOnce(`Description ${i}`)
          .mockResolvedValueOnce(`x-dre-config-${i}`);
      }

      const result = await promptExtensionConfiguration();

      expect(result).toHaveLength(10);
      // Should not be asked to add more after reaching 10
      expect(mockConfirm).toHaveBeenCalledTimes(10); // 1 initial + 9 "add another"
    });
  });
});
