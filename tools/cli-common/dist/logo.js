import fs from 'fs-extra';
import chalk from 'chalk';
import { logMessage } from './logging.js';
/**
 * Validates that a logo exists, is non-empty, and is a PNG image.
 * Mirrors the legacy CLI behaviour so callers can simply replace the old helper.
 */
export async function validatePngLogo(logoPath, options) {
    const silent = options?.silent ?? false;
    if (!(await fs.pathExists(logoPath))) {
        return false;
    }
    try {
        const stats = await fs.stat(logoPath);
        if (stats.size === 0) {
            logMessage(chalk.red(`❌ Logo file is empty: ${logoPath}`), silent);
            return false;
        }
        const buffer = await fs.readFile(logoPath);
        const isPNG = buffer.length >= 8 &&
            buffer[0] === 0x89 &&
            buffer[1] === 0x50 &&
            buffer[2] === 0x4e &&
            buffer[3] === 0x47 &&
            buffer[4] === 0x0d &&
            buffer[5] === 0x0a &&
            buffer[6] === 0x1a &&
            buffer[7] === 0x0a;
        if (!isPNG) {
            logMessage(chalk.red(`❌ Logo file is not a valid PNG: ${logoPath}`), silent);
            return false;
        }
        logMessage(chalk.gray(`✓ Logo validation passed: ${logoPath}`), silent);
        return true;
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        logMessage(chalk.red(`❌ Error validating logo: ${message}`), silent);
        return false;
    }
}
//# sourceMappingURL=logo.js.map