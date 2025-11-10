import { confirm } from '@inquirer/prompts';
import fs from 'fs-extra';
const { writeFileSync } = fs;
import yaml from 'js-yaml';
const { dump } = yaml;
import path from 'path';
import chalk from 'chalk';
import { bootstrapAssetsDirectory } from '../../../common/index.js';
import { promptExtensionDetails, promptToolDetails, promptPublisherDetails, promptAuthDetails, promptAutomationScriptDetails, promptEventTriggerDetails, promptDependencyDetails, getInputDescription } from '../shared/prompts.js';
export async function initProject(options) {
    console.log(chalk.blue('🐉 Dragon Copilot Extension Generator'));
    console.log(chalk.gray('Initializing a new extension project...\n'));
    // Step 1: Extension Details
    console.log(chalk.blue('📝 Step 1: Extension Details'));
    console.log(chalk.gray('Let\'s start with basic information about your extension.\n'));
    const extensionDetails = await promptExtensionDetails({
        ...(options.name ? { name: options.name } : {}),
        ...(options.description ? { description: options.description } : {}),
        ...(options.version ? { version: options.version } : {})
    });
    // Step 2: Authentication Configuration
    console.log(chalk.blue('\n🔐 Step 2: Authentication Configuration'));
    console.log(chalk.gray('Configure Azure Entra ID authentication for your extension.\n'));
    const authDetails = await promptAuthDetails();
    // Step 3: Publisher Configuration
    console.log(chalk.blue('\n📋 Step 3: Publisher Configuration'));
    console.log(chalk.gray('Publisher information is required for deployment and marketplace listing.'));
    console.log(chalk.gray('This creates a separate publisher.json file that can be reused across extensions.\n'));
    const createPublisherConfig = await confirm({
        message: 'Create publisher configuration file (publisher.json)?',
        default: true
    });
    let publisherConfig = null;
    if (createPublisherConfig) {
        publisherConfig = await promptPublisherDetails();
    }
    // Step 4: Assets Setup
    console.log(chalk.blue('\n🎨 Step 4: Assets Setup'));
    console.log(chalk.gray('Extensions require a large logo (216x216 to 350x350 px) for marketplace listing.'));
    console.log(chalk.gray('We\'ll create an assets directory with a sample logo to get you started.\n'));
    const setupAssets = await confirm({
        message: 'Create assets directory with sample logo?',
        default: true
    });
    if (setupAssets) {
        await bootstrapAssetsDirectory(options.output || '.', {
            assetsDirName: 'assets'
        });
    }
    // Step 5: Extension Tools
    console.log(chalk.blue('\n🛠️  Step 5: Extension Tools'));
    console.log(chalk.gray('Tools define the AI-powered functionality your extension provides.'));
    console.log(chalk.gray('Each tool processes specific types of clinical data and returns results.\n'));
    const addTool = await confirm({
        message: 'Add an initial tool?',
        default: true
    });
    const manifest = {
        manifestVersion: 3,
        name: extensionDetails.name,
        description: extensionDetails.description,
        version: extensionDetails.version,
        auth: {
            tenantId: authDetails.tenantId
        },
        tools: []
    };
    if (addTool) {
        // Use shared prompt for tool details (single input for init)
        const toolDetails = await promptToolDetails(undefined, {
            allowMultipleInputs: true, // Allow multiple inputs for flexibility
            defaults: {
                toolName: 'my-tool',
                toolDescription: 'Processes clinical data',
                endpoint: 'https://api.example.com/tool-route/v1/process'
            }
        });
        manifest.tools.push({
            name: toolDetails.toolName,
            description: toolDetails.toolDescription,
            endpoint: toolDetails.endpoint,
            inputs: toolDetails.inputTypes.map((dataType, index) => ({
                name: dataType === 'DSP/Note' ? 'note' :
                    dataType === 'DSP/IterativeTranscript' ? 'iterative-transcript' :
                        dataType === 'DSP/IterativeAudio' ? 'iterative-audio' :
                            dataType === 'DSP/Transcript' ? 'transcript' :
                                `input-${index + 1}`,
                description: getInputDescription(dataType),
                data: dataType
            })),
            outputs: toolDetails.outputs
        });
    }
    const automationScripts = [];
    const configureAutomationScripts = await confirm({
        message: 'Add automation scripts for your extension?',
        default: false
    });
    if (configureAutomationScripts) {
        let addAnotherScript = true;
        while (addAnotherScript) {
            const scriptDetails = await promptAutomationScriptDetails(automationScripts);
            const script = {
                name: scriptDetails.name,
                entryPoint: scriptDetails.entryPoint,
                runtime: scriptDetails.runtime
            };
            if (scriptDetails.description) {
                script.description = scriptDetails.description;
            }
            if (typeof scriptDetails.timeoutSeconds === 'number') {
                script.timeoutSeconds = scriptDetails.timeoutSeconds;
            }
            automationScripts.push(script);
            addAnotherScript = await confirm({
                message: 'Add another automation script?',
                default: false
            });
        }
    }
    if (automationScripts.length > 0) {
        manifest.automationScripts = automationScripts;
    }
    const eventTriggers = [];
    if (automationScripts.length > 0) {
        const configureEventTriggers = await confirm({
            message: 'Configure event triggers that call automation scripts?',
            default: true
        });
        if (configureEventTriggers) {
            let addAnotherTrigger = true;
            while (addAnotherTrigger) {
                const triggerDetails = await promptEventTriggerDetails(eventTriggers, automationScripts);
                const trigger = {
                    name: triggerDetails.name,
                    eventType: triggerDetails.eventType,
                    scriptName: triggerDetails.scriptName
                };
                if (triggerDetails.description) {
                    trigger.description = triggerDetails.description;
                }
                if (triggerDetails.conditions) {
                    trigger.conditions = triggerDetails.conditions;
                }
                eventTriggers.push(trigger);
                addAnotherTrigger = await confirm({
                    message: 'Add another event trigger?',
                    default: false
                });
            }
        }
    }
    if (eventTriggers.length > 0) {
        manifest.eventTriggers = eventTriggers;
    }
    const dependencies = [];
    const addDependencies = await confirm({
        message: 'Declare external dependencies?',
        default: false
    });
    if (addDependencies) {
        let addAnotherDependency = true;
        while (addAnotherDependency) {
            const dependencyDetails = await promptDependencyDetails(dependencies);
            const dependency = {
                name: dependencyDetails.name,
                version: dependencyDetails.version
            };
            if (dependencyDetails.type) {
                dependency.type = dependencyDetails.type;
            }
            dependencies.push(dependency);
            addAnotherDependency = await confirm({
                message: 'Add another dependency?',
                default: false
            });
        }
    }
    if (dependencies.length > 0) {
        manifest.dependencies = dependencies;
    }
    const outputPath = path.join(options.output || '.', 'extension.yaml');
    const yamlContent = dump(manifest, { lineWidth: -1 });
    writeFileSync(outputPath, yamlContent);
    // Create publisher.json if requested
    if (publisherConfig) {
        const publisherPath = path.join(options.output || '.', 'publisher.json');
        writeFileSync(publisherPath, JSON.stringify(publisherConfig, null, 2));
        console.log(chalk.green('\n✅ Publisher configuration created successfully!'));
        console.log(chalk.gray(`📁 Publisher config created at: ${publisherPath}`));
    }
    console.log(chalk.green('\n✅ Extension project initialized successfully!'));
    console.log(chalk.gray(`📁 Manifest created at: ${outputPath}`));
    if (setupAssets) {
        console.log(chalk.gray(`🎨 Assets directory created at: assets/`));
    }
    // Enhanced next steps with better organization
    console.log(chalk.blue('\n🎯 What\'s Next?'));
    if (setupAssets) {
        console.log(chalk.yellow('🎨 Logo Requirements:'));
        console.log(chalk.gray('   • Replace assets/logo_large.png with your own logo'));
        console.log(chalk.gray('   • Size: 216x216 to 350x350 pixels (PNG format)'));
        console.log(chalk.gray('   • This will be used to generate Medium (90x90) and Small (48x48) logos'));
    }
    if (addTool) {
        console.log(chalk.yellow('� Development Steps:'));
        console.log(chalk.gray('   1. Update the endpoint URL with your actual API'));
        console.log(chalk.gray('   2. Customize inputs and outputs as needed'));
        console.log(chalk.gray('   3. Test your extension locally'));
        if (publisherConfig) {
            console.log(chalk.yellow('\n📦 Deployment Steps:'));
            console.log(chalk.gray('   1. Review and update publisher configuration'));
            console.log(chalk.gray('   2. Package your extension: dragon-extension package'));
            console.log(chalk.gray('   3. Deploy to the marketplace'));
        }
    }
    else {
        console.log(chalk.yellow('🔧 Next Steps:'));
        console.log(chalk.gray('   1. Add tools to your extension: dragon-extension add-tool'));
        console.log(chalk.gray('   2. Update the manifest with your API endpoints'));
        console.log(chalk.gray('   3. Test and package your extension'));
    }
    console.log(chalk.blue('\n📚 Resources:'));
    console.log(chalk.gray('   • Validate your extension: dragon-extension validate'));
    console.log(chalk.gray('   • Add more tools: dragon-extension add-tool'));
    console.log(chalk.gray('   • Package for deployment: dragon-extension package'));
}
//# sourceMappingURL=init.js.map