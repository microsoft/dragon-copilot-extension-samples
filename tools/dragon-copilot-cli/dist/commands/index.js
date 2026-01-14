import { registerExtensionCommands } from '../domains/extension/index.js';
import { registerPartnerCommands } from '../domains/partner/index.js';
export function registerCommands(program) {
    registerExtensionCommands(program);
    registerPartnerCommands(program);
}
//# sourceMappingURL=index.js.map