import { registerExtensionCommands } from '../domains/extension/index.js';
import { registerConnectorCommands } from '../domains/connector/index.js';
export function registerCommands(program) {
    registerExtensionCommands(program);
    registerConnectorCommands(program);
}
//# sourceMappingURL=index.js.map