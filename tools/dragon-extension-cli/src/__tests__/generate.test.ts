import { generateManifest } from '../commands/generate.js';
import { GenerateOptions } from '../types.js';
import fs from 'fs-extra';
import yaml from 'js-yaml';

// Mock dependencies
jest.mock('fs-extra');
jest.mock('@inquirer/prompts');
jest.mock('../shared/prompts.js');
jest.mock('../templates/index.js');

import { confirm } from '@inquirer/prompts';
import {
  promptToolDetails,
  promptPublisherDetails,
  promptExtensionConfiguration
} from '../shared/prompts.js';

const mockConfirm = confirm as jest.MockedFunction<typeof confirm>;
const mockPromptToolDetails = promptToolDetails as jest.MockedFunction<typeof promptToolDetails>;
const mockPromptPublisherDetails = promptPublisherDetails as jest.MockedFunction<typeof promptPublisherDetails>;
const mockPromptExtensionConfiguration = promptExtensionConfiguration as jest.MockedFunction<typeof promptExtensionConfiguration>;
const mockReadFileSync = fs.readFileSync as jest.MockedFunction<typeof fs.readFileSync>;
const mockWriteFileSync = fs.writeFileSync as jest.MockedFunction<typeof fs.writeFileSync>;
const mockExistsSync = fs.existsSync as jest.MockedFunction<typeof fs.existsSync>;

// Mock console methods to avoid noise in tests
const mockConsoleLog = jest.spyOn(console, 'log').mockImplementation();

describe('Generate Command with Optional Tool', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('should create manifest with tool when user chooses to add tool', async () => {
    const options: GenerateOptions = {
      interactive: true,
      output: 'test-extension.yaml'
    };

    // Mock that no existing manifest exists
    mockReadFileSync.mockImplementation(() => {
      throw new Error('File not found');
    });

    // Mock that no publisher.json exists
    mockExistsSync.mockReturnValue(false);

    mockConfirm
      .mockResolvedValueOnce(false)  // Don't create publisher config
      .mockResolvedValueOnce(true);  // Add tool

    mockPromptExtensionConfiguration.mockResolvedValue([]);

    mockPromptToolDetails.mockResolvedValue({
      toolName: 'test-tool',
      toolDescription: 'A test tool',
      endpoint: 'https://api.example.com/test',
      inputTypes: ['DSP/Note'],
      includeAdaptiveCard: true
    });

    await generateManifest(options);

    expect(mockWriteFileSync).toHaveBeenCalledWith(
      'test-extension.yaml',
      expect.stringContaining('test-tool')
    );

    // Verify the manifest structure
    const yamlContent = mockWriteFileSync.mock.calls[0][1] as string;
    const parsedManifest = yaml.load(yamlContent) as any;

    expect(parsedManifest).toMatchObject({
      name: 'my-extension',
      description: 'A Dragon Copilot extension',
      version: '0.0.1',
      tools: [
        {
          name: 'test-tool',
          description: 'A test tool',
          endpoint: 'https://api.example.com/test'
        }
      ]
    });
  });

  test('should create manifest without tool when user chooses not to add tool', async () => {
    const options: GenerateOptions = {
      interactive: true,
      output: 'test-extension.yaml'
    };

    // Mock that no existing manifest exists
    mockReadFileSync.mockImplementation(() => {
      throw new Error('File not found');
    });

    // Mock that no publisher.json exists
    mockExistsSync.mockReturnValue(false);

    mockConfirm
      .mockResolvedValueOnce(false)  // Don't create publisher config
      .mockResolvedValueOnce(false); // Don't add tool

    mockPromptExtensionConfiguration.mockResolvedValue([]);

    await generateManifest(options);

    expect(mockWriteFileSync).toHaveBeenCalledWith(
      'test-extension.yaml',
      expect.any(String)
    );

    // Verify the manifest structure - should have empty tools array
    const yamlContent = mockWriteFileSync.mock.calls[0][1] as string;
    const parsedManifest = yaml.load(yamlContent) as any;

    expect(parsedManifest).toMatchObject({
      name: 'my-extension',
      description: 'A Dragon Copilot extension',
      version: '0.0.1',
      tools: []
    });
  });

  test('should create manifest with only configuration when no tool is added', async () => {
    const options: GenerateOptions = {
      interactive: true,
      output: 'test-extension.yaml'
    };

    // Mock that no existing manifest exists
    mockReadFileSync.mockImplementation(() => {
      throw new Error('File not found');
    });

    // Mock that no publisher.json exists
    mockExistsSync.mockReturnValue(false);

    mockConfirm
      .mockResolvedValueOnce(false)  // Don't create publisher config
      .mockResolvedValueOnce(false); // Don't add tool

    mockPromptExtensionConfiguration.mockResolvedValue([
      {
        label: 'API Key',
        description: 'Your API key',
        header: 'x-dre-api-key'
      }
    ]);

    await generateManifest(options);

    // Verify the manifest structure
    const yamlContent = mockWriteFileSync.mock.calls[0][1] as string;
    const parsedManifest = yaml.load(yamlContent) as any;

    expect(parsedManifest).toMatchObject({
      name: 'my-extension',
      description: 'A Dragon Copilot extension',
      version: '0.0.1',
      tools: [],
      configuration: [
        {
          label: 'API Key',
          description: 'Your API key',
          header: 'x-dre-api-key'
        }
      ]
    });
  });

  test('should add tool to existing manifest when user chooses to add tool', async () => {
    const options: GenerateOptions = {
      interactive: true,
      output: 'existing-extension.yaml'
    };

    const existingManifest = {
      name: 'existing-extension',
      description: 'An existing extension',
      version: '1.0.0',
      tools: [
        {
          name: 'existing-tool',
          description: 'An existing tool',
          endpoint: 'https://api.example.com/existing',
          inputs: [],
          outputs: []
        }
      ]
    };

    // Mock that existing manifest exists
    mockReadFileSync.mockReturnValue(yaml.dump(existingManifest));

    // Mock that no publisher.json exists
    mockExistsSync.mockReturnValue(false);

    mockConfirm
      .mockResolvedValueOnce(false)  // Don't create publisher config
      .mockResolvedValueOnce(true)   // Add tool
      .mockResolvedValueOnce(false); // Don't add configuration

    mockPromptToolDetails.mockResolvedValue({
      toolName: 'new-tool',
      toolDescription: 'A new tool',
      endpoint: 'https://api.example.com/new',
      inputTypes: ['DSP/Note'],
      includeAdaptiveCard: false
    });

    await generateManifest(options);

    // Verify the manifest structure
    const yamlContent = mockWriteFileSync.mock.calls[0][1] as string;
    const parsedManifest = yaml.load(yamlContent) as any;

    expect(parsedManifest).toMatchObject({
      name: 'existing-extension',
      description: 'An existing extension',
      version: '1.0.0',
      tools: [
        {
          name: 'existing-tool'
        },
        {
          name: 'new-tool',
          description: 'A new tool',
          endpoint: 'https://api.example.com/new'
        }
      ]
    });

    expect((parsedManifest as any).tools).toHaveLength(2);
  });

  test('should update existing manifest without adding tool when user chooses not to', async () => {
    const options: GenerateOptions = {
      interactive: true,
      output: 'existing-extension.yaml'
    };

    const existingManifest = {
      name: 'existing-extension',
      description: 'An existing extension',
      version: '1.0.0',
      tools: [
        {
          name: 'existing-tool',
          description: 'An existing tool',
          endpoint: 'https://api.example.com/existing',
          inputs: [],
          outputs: []
        }
      ]
    };

    // Mock that existing manifest exists
    mockReadFileSync.mockReturnValue(yaml.dump(existingManifest));

    // Mock that no publisher.json exists
    mockExistsSync.mockReturnValue(false);

    mockConfirm
      .mockResolvedValueOnce(false)  // Don't create publisher config
      .mockResolvedValueOnce(false)  // Don't add tool
      .mockResolvedValueOnce(true);  // Add configuration

    mockPromptExtensionConfiguration.mockResolvedValue([
      {
        label: 'Environment',
        description: 'Target environment',
        header: 'x-dre-environment'
      }
    ]);

    await generateManifest(options);

    // Verify the manifest structure
    const yamlContent = mockWriteFileSync.mock.calls[0][1] as string;
    const parsedManifest = yaml.load(yamlContent) as any;

    expect(parsedManifest).toMatchObject({
      name: 'existing-extension',
      description: 'An existing extension',
      version: '1.0.0',
      tools: [
        {
          name: 'existing-tool'
        }
      ],
      configuration: [
        {
          label: 'Environment',
          description: 'Target environment',
          header: 'x-dre-environment'
        }
      ]
    });

    // Should still have only the original tool
    expect((parsedManifest as any).tools).toHaveLength(1);
  });

  test('should create manifest with configuration when no tool is added', async () => {
    const options: GenerateOptions = {
      interactive: true
    };

    // Test case: Only configuration added
    mockReadFileSync.mockImplementation(() => {
      throw new Error('File not found');
    });
    mockExistsSync.mockReturnValue(false);
    mockConfirm
      .mockResolvedValueOnce(false)  // Don't create publisher config
      .mockResolvedValueOnce(false); // Don't add tool
    mockPromptExtensionConfiguration.mockResolvedValue([
      { label: 'API Key', description: 'API key', header: 'x-dre-api-key' }
    ]);

    await generateManifest(options);

    // Verify the manifest was created with configuration but no tools
    const yamlContent = mockWriteFileSync.mock.calls[0][1] as string;
    const parsedManifest = yaml.load(yamlContent) as any;

    expect(parsedManifest.tools).toEqual([]);
    expect(parsedManifest.configuration).toHaveLength(1);
    expect(parsedManifest.configuration[0]).toMatchObject({
      label: 'API Key',
      description: 'API key',
      header: 'x-dre-api-key'
    });
  });
});
