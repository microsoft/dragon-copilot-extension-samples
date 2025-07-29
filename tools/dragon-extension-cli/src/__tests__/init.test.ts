import { initProject } from '../commands/init.js';
import { InitOptions } from '../types.js';
import fs from 'fs-extra';
import yaml from 'js-yaml';

// Mock dependencies
jest.mock('fs-extra');
jest.mock('@inquirer/prompts');
jest.mock('../shared/prompts.js');

import { confirm } from '@inquirer/prompts';
import {
  promptExtensionDetails,
  promptPublisherDetails,
  promptExtensionConfiguration,
  promptToolDetails
} from '../shared/prompts.js';

const mockConfirm = confirm as jest.MockedFunction<typeof confirm>;
const mockPromptExtensionDetails = promptExtensionDetails as jest.MockedFunction<typeof promptExtensionDetails>;
const mockPromptPublisherDetails = promptPublisherDetails as jest.MockedFunction<typeof promptPublisherDetails>;
const mockPromptExtensionConfiguration = promptExtensionConfiguration as jest.MockedFunction<typeof promptExtensionConfiguration>;
const mockPromptToolDetails = promptToolDetails as jest.MockedFunction<typeof promptToolDetails>;
const mockWriteFileSync = fs.writeFileSync as jest.MockedFunction<typeof fs.writeFileSync>;

// Mock console methods to avoid noise in tests
const mockConsoleLog = jest.spyOn(console, 'log').mockImplementation();

describe('Init Command with Configuration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    mockConsoleLog.mockRestore();
  });

  test('should create manifest with configuration when provided', async () => {
    const options: InitOptions = {
      output: './test-output'
    };

    // Mock the prompt responses
    mockPromptExtensionDetails.mockResolvedValue({
      name: 'test-extension',
      description: 'A test extension',
      version: '1.0.0'
    });

    mockConfirm
      .mockResolvedValueOnce(false)  // Don't create publisher config
      .mockResolvedValueOnce(true);  // Add initial tool

    mockPromptExtensionConfiguration.mockResolvedValue([
      {
        label: 'API Key',
        description: 'Your organization API key',
        header: 'x-dre-api-key'
      },
      {
        label: 'Environment',
        description: 'Target environment setting',
        header: 'x-dre-environment'
      }
    ]);

    mockPromptToolDetails.mockResolvedValue({
      toolName: 'test-tool',
      toolDescription: 'A test tool',
      endpoint: 'https://api.example.com/test',
      inputTypes: ['DSP/Note'],
      includeAdaptiveCard: true
    });

    await initProject(options);

    // Verify that writeFileSync was called with the correct manifest
    expect(mockWriteFileSync).toHaveBeenCalledWith(
      expect.stringContaining('extension.yaml'),
      expect.stringContaining('configuration:')
    );

    // Get the actual YAML content that was written
    const yamlContent = mockWriteFileSync.mock.calls[0][1] as string;
    const parsedManifest = yaml.load(yamlContent);

    expect(parsedManifest).toMatchObject({
      name: 'test-extension',
      description: 'A test extension',
      version: '1.0.0',
      configuration: [
        {
          label: 'API Key',
          description: 'Your organization API key',
          header: 'x-dre-api-key'
        },
        {
          label: 'Environment',
          description: 'Target environment setting',
          header: 'x-dre-environment'
        }
      ],
      tools: [
        {
          name: 'test-tool',
          description: 'A test tool',
          endpoint: 'https://api.example.com/test',
          inputs: [
            {
              name: 'note',
              data: 'DSP/Note'
              // description is optional in test comparison
            }
          ],
          outputs: [
            {
              name: 'processed-data',
              description: 'Processed data response',
              data: 'DSP'
            },
            {
              name: 'adaptive-card',
              description: 'Adaptive Card response',
              data: 'DSP'
            }
          ]
        }
      ]
    });
  });

  test('should create manifest without configuration when none provided', async () => {
    const options: InitOptions = {
      output: './test-output'
    };

    mockPromptExtensionDetails.mockResolvedValue({
      name: 'test-extension',
      description: 'A test extension',
      version: '1.0.0'
    });

    mockConfirm
      .mockResolvedValueOnce(false)  // Don't create publisher config
      .mockResolvedValueOnce(true);  // Add initial tool

    mockPromptExtensionConfiguration.mockResolvedValue([]); // No configuration

    mockPromptToolDetails.mockResolvedValue({
      toolName: 'test-tool',
      toolDescription: 'A test tool',
      endpoint: 'https://api.example.com/test',
      inputTypes: ['DSP/Note'],
      includeAdaptiveCard: true
    });

    await initProject(options);

    // Get the actual YAML content that was written
    const yamlContent = mockWriteFileSync.mock.calls[0][1] as string;
    const parsedManifest = yaml.load(yamlContent);

    // Manifest should not have a configuration property
    expect(parsedManifest).not.toHaveProperty('configuration');
    expect(parsedManifest).toMatchObject({
      name: 'test-extension',
      description: 'A test extension',
      version: '1.0.0',
      tools: expect.any(Array)
    });
  });

  test('should create manifest with configuration but without tools', async () => {
    const options: InitOptions = {
      output: './test-output'
    };

    mockPromptExtensionDetails.mockResolvedValue({
      name: 'test-extension',
      description: 'A test extension',
      version: '1.0.0'
    });

    mockConfirm
      .mockResolvedValueOnce(false)  // Don't create publisher config
      .mockResolvedValueOnce(false); // Don't add initial tool

    mockPromptExtensionConfiguration.mockResolvedValue([
      {
        label: 'API Key',
        description: 'Your organization API key',
        header: 'x-dre-api-key'
      }
    ]);

    await initProject(options);

    // Get the actual YAML content that was written
    const yamlContent = mockWriteFileSync.mock.calls[0][1] as string;
    const parsedManifest = yaml.load(yamlContent);

    expect(parsedManifest).toMatchObject({
      name: 'test-extension',
      description: 'A test extension',
      version: '1.0.0',
      configuration: [
        {
          label: 'API Key',
          description: 'Your organization API key',
          header: 'x-dre-api-key'
        }
      ],
      tools: []
    });
  });

  test('should respect command line options for extension details', async () => {
    const options: InitOptions = {
      name: 'cli-extension',
      description: 'From CLI',
      version: '2.0.0',
      output: './test-output'
    };

    mockPromptExtensionDetails.mockResolvedValue({
      name: 'cli-extension',
      description: 'From CLI',
      version: '2.0.0'
    });

    mockConfirm
      .mockResolvedValueOnce(false)  // Don't create publisher config
      .mockResolvedValueOnce(false); // Don't add initial tool

    mockPromptExtensionConfiguration.mockResolvedValue([]);

    await initProject(options);

    // Verify that promptExtensionDetails was called with the CLI options
    expect(mockPromptExtensionDetails).toHaveBeenCalledWith({
      name: 'cli-extension',
      description: 'From CLI',
      version: '2.0.0'
    });
  });
});
