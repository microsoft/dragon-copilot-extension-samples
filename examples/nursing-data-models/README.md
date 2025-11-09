# Nursing Data Models

This folder contains example nursing data models (FHIR StructureDefinitions, JSON Schema, and example instances) intended to help extension developers adopt consistent nursing data patterns.

Files:

- StructureDefinition-UKCore-NursingPressureRiskAssessment.json: FHIR profile (Observation) for pressure injury risk assessment (Braden scale) with component slices and AI provenance extension.
- Extension-AIProvenance.json: FHIR Extension StructureDefinition to capture provenance (human-authored / ai-assisted / ai-generated) plus details for audit.
- mconds-nursing-assessment-v1.schema.json: JSON Schema for MCINDS nursing assessment entries, intended to map to FHIR Observation payloads.
- examples/: Example Observation resources and a JSON instance that validates against the schema.

Validation

- FHIR StructureDefinition can be validated with the HL7 FHIR validator (4.0.1). See the repository CI workflow for an example.
- JSON Schema can be validated with ajv (node). Example: `npx ajv validate -s mconds-nursing-assessment-v1.schema.json -d examples/mconds-assessment-example.json`

Provenance & Governance

The AI provenance extension indicates whether content is human-authored, ai-assisted, or ai-generated. Implementers should enforce clinical sign-off policies when data is marked ai-assisted or ai-generated. (Placeholder governance — update according to your organisation's policy.)

Contact

Maintainer: lincoln@clinyqai.com
