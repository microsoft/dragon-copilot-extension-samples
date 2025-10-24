export interface LogoValidationOptions {
    silent?: boolean;
}
/**
 * Validates that a logo exists, is non-empty, and is a PNG image.
 * Mirrors the legacy CLI behaviour so callers can simply replace the old helper.
 */
export declare function validatePngLogo(logoPath: string, options?: LogoValidationOptions): Promise<boolean>;
//# sourceMappingURL=logo.d.ts.map