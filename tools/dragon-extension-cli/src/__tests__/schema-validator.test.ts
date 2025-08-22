import { validateExtensionManifest, validatePublisherConfig } from '../shared/schema-validator.js';
import { DragonExtensionManifest, PublisherConfig } from '../types.js';

describe('Schema Validation', () => {
  describe('validateExtensionManifest', () => {
    test('should validate a correct manifest with configuration', () => {
      const manifest: DragonExtensionManifest = {
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
            description: 'Target environment configuration',
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
                description: 'Clinical note',
                data: 'DSP/Note'
              }
            ],
            outputs: [
              {
                name: 'result',
                description: 'Processed result',
                data: 'DSP'
              }
            ]
          }
        ]
      };

      const result = validateExtensionManifest(manifest);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('should detect invalid configuration header', () => {
      const manifest: DragonExtensionManifest = {
        name: 'test-extension',
        description: 'A test extension',
        version: '1.0.0',
        configuration: [
          {
            label: 'API Key',
            description: 'Your organization API key',
            header: 'api-key' // Should start with x-dre-
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
                description: 'Clinical note',
                data: 'DSP/Note'
              }
            ],
            outputs: [
              {
                name: 'result',
                description: 'Processed result',
                data: 'DSP'
              }
            ]
          }
        ]
      };

      const result = validateExtensionManifest(manifest);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors.some(error => error.message.includes('x-dre-'))).toBe(true);
    });

    test('should detect configuration label that is too long', () => {
      const manifest: DragonExtensionManifest = {
        name: 'test-extension',
        description: 'A test extension',
        version: '1.0.0',
        configuration: [
          {
            label: 'a'.repeat(31), // Too long (max 30)
            description: 'Valid description',
            header: 'x-dre-api-key'
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
                description: 'Clinical note',
                data: 'DSP/Note'
              }
            ],
            outputs: [
              {
                name: 'result',
                description: 'Processed result',
                data: 'DSP'
              }
            ]
          }
        ]
      };

      const result = validateExtensionManifest(manifest);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    test('should detect configuration description that is too long', () => {
      const manifest: DragonExtensionManifest = {
        name: 'test-extension',
        description: 'A test extension',
        version: '1.0.0',
        configuration: [
          {
            label: 'API Key',
            description: 'a'.repeat(101), // Too long (max 100)
            header: 'x-dre-api-key'
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
                description: 'Clinical note',
                data: 'DSP/Note'
              }
            ],
            outputs: [
              {
                name: 'result',
                description: 'Processed result',
                data: 'DSP'
              }
            ]
          }
        ]
      };

      const result = validateExtensionManifest(manifest);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    test('should validate a correct manifest', () => {
      const manifest: DragonExtensionManifest = {
        name: 'test-extension',
        description: 'A test extension',
        version: '1.0.0',
        tools: [
          {
            name: 'test-tool',
            description: 'A test tool',
            endpoint: 'https://api.example.com/test',
            inputs: [
              {
                name: 'note',
                description: 'Clinical note',
                data: 'DSP/Note'
              }
            ],
            outputs: [
              {
                name: 'result',
                description: 'Processed result',
                data: 'DSP'
              }
            ]
          }
        ]
      };

      const result = validateExtensionManifest(manifest);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('should detect invalid extension name', () => {
      const manifest: DragonExtensionManifest = {
        name: 'Test Extension!', // Invalid characters
        description: 'A test extension',
        version: '1.0.0',
        tools: [
          {
            name: 'test-tool',
            description: 'A test tool',
            endpoint: 'https://api.example.com/test',
            inputs: [
              {
                name: 'note',
                description: 'Clinical note',
                data: 'DSP/Note'
              }
            ],
            outputs: [
              {
                name: 'result',
                description: 'Processed result',
                data: 'DSP'
              }
            ]
          }
        ]
      };

      const result = validateExtensionManifest(manifest);
      expect(result.isValid).toBe(false);
      expect(result.errors.some((e: any) => e.instancePath.includes('name'))).toBe(true);
    });

    test('should detect missing required fields', () => {
      const manifest = {
        name: 'test-extension'
        // Missing description, version, tools
      } as any;

      const result = validateExtensionManifest(manifest);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('validatePublisherConfig', () => {
    test('should validate a correct publisher config', () => {
      const config: PublisherConfig = {
        publisherId: 'contoso.healthcare',
        publisherName: 'Contoso Healthcare Inc.',
        websiteUrl: 'https://www.contosohealth.com',
        privacyPolicyUrl: 'https://www.contosohealth.com/privacy',
        supportUrl: 'https://www.contosohealth.com/support',
        version: '0.0.1',
        contactEmail: 'support@contosohealth.com',
        offerId: 'contoso-extension-suite',
        defaultLocale: 'en-US',
        scope: 'Workflow',
        supportedLocales: ['en-US'],
        regions: ['US']
      };

      const result = validatePublisherConfig(config);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('should reject non-US countries', () => {
      const config: PublisherConfig = {
        publisherId: 'contoso.healthcare',
        publisherName: 'Contoso Healthcare Inc.',
        websiteUrl: 'https://www.contosohealth.com',
        privacyPolicyUrl: 'https://www.contosohealth.com/privacy',
        supportUrl: 'https://www.contosohealth.com/support',
        version: '0.0.1',
        contactEmail: 'support@contosohealth.com',
        offerId: 'contoso-extension-suite',
        defaultLocale: 'en-US',
        supportedLocales: ['en-US'],
        scope: 'Workflow',
        regions: ['FR'] // Invalid country
      };

      const result = validatePublisherConfig(config);
      expect(result.isValid).toBe(false);
      expect(result.errors.some((e: any) => e.instancePath.includes('regions'))).toBe(true);
    });

    test('should reject non-en-US locales', () => {
      const config: PublisherConfig = {
        publisherId: 'contoso.healthcare',
        publisherName: 'Contoso Healthcare Inc.',
        websiteUrl: 'https://www.contosohealth.com',
        privacyPolicyUrl: 'https://www.contosohealth.com/privacy',
        supportUrl: 'https://www.contosohealth.com/support',
        version: '0.0.1',
        contactEmail: 'support@contosohealth.com',
        offerId: 'contoso-extension-suite',
        defaultLocale: 'fr-FR', // Invalid locale
        supportedLocales: ['fr-FR'], // Invalid locale
        scope: 'Workflow',
        regions: ['US']
      };

      const result = validatePublisherConfig(config);
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });
});
