export type DicomModality =
  | 'CR' | 'CT' | 'DX' | 'MG' | 'MR'
  | 'NM' | 'PT' | 'RF' | 'US' | 'XA';

export type BodyPart =
  | 'HEAD' | 'BRAIN' | 'SKULL' | 'SINUS' | 'NECK'
  | 'CSPINE' | 'TSPINE' | 'LSPINE' | 'SPINE'
  | 'CHEST' | 'ABDOMEN' | 'PELVIS'
  | 'SHOULDER' | 'ELBOW' | 'WRIST' | 'HAND'
  | 'HIP' | 'KNEE' | 'ANKLE' | 'FOOT'
  | 'WHOLEBODY';

export type InputContentType =
  | 'application/vnd.ms-dragon.dsp.rad.report+json'
  | 'application/vnd.ms-dragon.dsp.rad.patient-info+json';

export type OutputContentType =
  | 'application/vnd.ms-dragon.dsp.rad.quality-result+json';

export interface DragonInputConfig {
  minNumberOfPriors?: number;
  maxNumberOfPriors?: number;
  relevantBodyParts?: BodyPart[];
  relevantModalities?: DicomModality[];
}

export interface RelevanceFilteringCriteria {
  relevantBodyParts?: BodyPart[];
  relevantModalities?: DicomModality[];
}

export interface ManifestInput {
  name: string;
  description: string;
  'content-type': InputContentType;
  required?: boolean;
  config?: DragonInputConfig;
}

export interface ManifestOutput {
  name: string;
  description: string;
  'content-type': OutputContentType;
}

export interface ManifestTool {
  name: string;
  toolType: 'contractBased' | 'uiBased' | 'mcpBased' | 'agentBased';
  capability: 'reportGeneration' | 'qualityCheck';
  description: string;
  endpoint: string;
  inputs: ManifestInput[];
  outputs: ManifestOutput[];
  relevanceFilteringCriteria?: RelevanceFilteringCriteria;
  configurationTemplate?: Record<string, unknown>;
}

export interface ManifestAuth {
  tenantId: string;
}

export interface ExtensionManifest {
  name: string;
  description: string;
  version: string;
  auth: ManifestAuth;
  tools: ManifestTool[];
}

