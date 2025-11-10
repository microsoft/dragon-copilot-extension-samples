# Sample Requests and Responses

This directory contains sample requests and responses for the Dragon Copilot extension. The examples align with the **manifest version 3** structure produced by the unified CLI.

## Sample Request: Note Payload

File: [note-payload.json](./note-payload.json)

This file contains a sample request payload for an extension that is configured to handle an input of type `DSP/Note`. The name of the parameter is `note`, which is defined in the extension's manifest.

Sample Manifest Configuration:
```yaml
    manifestVersion: 3
    inputs:
      - name: note
        description: Note
        data: DSP/Note
    automationScripts:
      - name: note-automation
        entryPoint: scripts/analyze-note/index.js
        runtime: nodejs18
    eventTriggers:
      - name: note-created
        eventType: note.created
        scriptName: note-automation
```

## Sample Response: Plugin Result

File: [plugin-result.json](./plugin-result.json)

This file contains a sample response from a plugin that processes the note payload. The name of the response is `adaptive-card`, which is defined in the extension's manifest.

Sample Manifest Configuration:
```yaml
    outputs:
      - name: adaptive-card
        description: Response from the plugin
        data: DSP

    automationScripts:
      - name: note-automation
        entryPoint: scripts/analyze-note/index.js
        runtime: nodejs18
```
