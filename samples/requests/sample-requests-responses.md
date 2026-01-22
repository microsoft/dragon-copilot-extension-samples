# Sample Requests and Responses

This directory contains sample requests and responses for the Dragon Copilot extension.

## Sample Request: Note Payload

File: [note-payload.json](./note-payload.json)

This file contains a sample request payload for an extension that is configured to handle an input of content-type `application/vnd.ms-dragon.dsp.note+json`. The name of the parameter is `note`, which is defined in the extension's manifest.

Sample Manifest Configuration:
```yaml
    inputs:
      - name: note
        description: Note
        content-type: application/vnd.ms-dragon.dsp.note+json
```

## Sample Request: Iterative Audio Payload

File: [iterative-audio-payload.json](./iterative-audio-payload.json)

This file contains a sample request payload for an extension that is configured to handle an input of content-type `application/vnd.ms-dragon.dsp.iterative-audio+json`. The name of the parameter is `iterativeAudio`, which is defined in the extension's manifest.

Sample Manifest Configuration:
```yaml
    inputs:
      - name: iterativeAudio
        description: Audio
        content-type: application/vnd.ms-dragon.dsp.iterative-audio+json
```

## Sample Response: Plugin Result

File: [plugin-result.json](./plugin-result.json)

This file contains a sample response from a plugin that processes the note payload. The name of the response is `adaptive-card`, which is defined in the extension's manifest.

Sample Manifest Configuration:
```yaml
    outputs:
      - name: adaptive-card
        description: Response from the plugin
        content-type: application/vnd.ms-dragon.dsp+json
```
