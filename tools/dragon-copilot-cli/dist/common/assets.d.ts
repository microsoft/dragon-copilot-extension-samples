export interface AssetBootstrapOptions {
    assetsDirName?: string;
    silent?: boolean;
    overwrite?: boolean;
}
export interface AssetBootstrapResult {
    assetsDir: string;
    logoPath: string;
    copied: boolean;
}
export declare function bootstrapAssetsDirectory(baseDir: string, options?: AssetBootstrapOptions): Promise<AssetBootstrapResult>;
//# sourceMappingURL=assets.d.ts.map