# Sample Requests and Responses

This directory contains sample request and response payloads for a Dragon Copilot (radiologists) extension. See [`radiologists-extensibility-api.yaml`](../../../radiologists-extensibility-api.yaml) for the full API contract.

## Sample Request: Patient Information

File: [PatientInformationRequest-Example.json](./PatientInformationRequest-Example.json)

This file contains a sample request payload for an extension that is configured to handle an input of content-type `application/vnd.ms-dragon.rad.patient-information+json`. The name of the parameter is `patientInformation`, which is defined in the extension's manifest.

Sample Manifest Configuration:

```yaml
inputs:
    - name: patientInformation
      description: Patient demographic information from Dragon Copilot
      content-type: application/vnd.ms-dragon.rad.patient-information+json
      schemaVersion: "1.0"
```

## Sample Request: Report Payload

File: [ReportRequest-Example.json](./ReportRequest-Example.json)

This file contains a sample request payload for an extension that is configured to handle an input of content-type `application/vnd.ms-dragon.rad.report+json`. The name of the parameter is `report`, which is defined in the extension's manifest.

Sample Manifest Configuration:

```yaml
inputs:
    - name: report
      description: Radiology report from Dragon Copilot
      content-type: application/vnd.ms-dragon.rad.report+json
      schemaVersion: "1.0"
```

## Sample Request: Combined (Patient Information + Report)

File: [FullRequest-Example.json](./FullRequest-Example.json)

This file contains a sample request payload demonstrating both `patientInformation` and `report` inputs sent together in a single `/v1/process` request.

## Sample Response: Quality Check Result

File: [QualityCheckResultResponse-Example.json](./QualityCheckResultResponse-Example.json)

This file contains a sample response payload containing both `Billing` and `Clinical` recommendations, with provenance, reference resources, and partner-defined `additionalInfo`. The name of the response is `qualityCheckResult`, which is defined in the extension's manifest.

Sample Manifest Configuration:

```yaml
outputs:
    - name: qualityCheckResult
      description: Quality check findings and score
      content-type: application/vnd.ms-dragon.rad.quality-check-result+json
      schemaVersion: "1.0"
```
