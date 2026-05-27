# Sample Requests and Responses

This directory contains sample request and response payloads for a Dragon Copilot for Radiology extension. See [`radiology-extensibility-api.yaml`](../../../radiology-extensibility-api.yaml) for the full API contract.

## Sample Request: Patient Information

File: [PatientInformation-AllFields.json](./PatientInformation-AllFields.json)

This file contains a sample request payload for an extension that is configured to handle an input of content-type `application/vnd.ms-dragon.rad.patient-info+json`. The name of the parameter is `patient-info`, which is defined in the extension's manifest.

Sample Manifest Configuration:
```yaml
    inputs:
      - name: patient-info
        description: Patient demographic information from Dragon Copilot
        content-type: application/vnd.ms-dragon.rad.patient-info+json
```

## Sample Request: Report Payload

File: [Report-Minimal.json](./Report-Minimal.json)

This file contains a sample request payload for an extension that is configured to handle an input of content-type `application/vnd.ms-dragon.rad.report+json`. The name of the parameter is `report`, which is defined in the extension's manifest.

Sample Manifest Configuration:
```yaml
    inputs:
      - name: report
        description: Radiology report from Dragon Copilot
        content-type: application/vnd.ms-dragon.rad.report+json
```

## Sample Response: Quality Check Result

File: [QualityCheckResult-MixedBillingClinical.json](./QualityCheckResult-MixedBillingClinical.json)

This file contains a sample response payload containing both `Billing` and `Clinical` recommendations, with provenance, reference resources, and partner-defined `additionalInfo`. The name of the response is `quality-check-result`, which is defined in the extension's manifest.

Sample Manifest Configuration:
```yaml
    outputs:
      - name: quality-check-result
        description: Quality check findings and score
        content-type: application/vnd.ms-dragon.rad.quality-check-result+json
```
