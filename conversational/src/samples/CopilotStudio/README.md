# Copilot Studio Conversational Extension Sample

Connect a published [Microsoft Copilot Studio](https://learn.microsoft.com/microsoft-copilot-studio/) agent to the Dragon Copilot conversation. Copilot Studio hosts the agent, so this sample has **no server code** — only a manifest ([`extension.yaml`](extension.yaml)) and setup steps.

> **Public Preview.** Conversational extensions use manifest schema [`0.4.0-preview.2`](../../../manifest/0.4.0-preview.2/manifest-schema.json), which may change.

## 1. Build and publish the agent

Follow Microsoft Learn for the product steps:

- [Create an agent](https://learn.microsoft.com/microsoft-copilot-studio/authoring-first-bot#create-an-agent)
- [Create and edit topics](https://learn.microsoft.com/microsoft-copilot-studio/nlu-authoring)
- [Publish the agent](https://learn.microsoft.com/microsoft-copilot-studio/fundamentals-get-started#publish-your-agent)

Example "scheduling" agent:

1. Create an agent named **Scheduling Agent**.
2. Add a topic **Appointment availability** with trigger phrases such as `when is the next available appointment`, `reschedule my visit`, `how do I prepare for my appointment`.
3. Reply with synthetic guidance (for example "The next available slot is Tuesday at 9:00 AM").
4. **Publish** the agent.

Use synthetic data only. Do not put real patient information in topics, variables, or test transcripts.

## 2. Collect the agent identity

In Copilot Studio open **Settings → Advanced → Metadata** ([docs](https://learn.microsoft.com/microsoft-copilot-studio/publication-communicate-with-agent-from-native-app#get-the-information-you-need-to-integrate-with-the-sdk)) and copy:

| Copilot Studio value | Manifest field |
| --- | --- |
| Environment ID | `environmentId` |
| Schema name (for example `cr123_schedulingAgent`) | `agentIdentifier` |

## 3. Fill in the manifest

Edit [`extension.yaml`](extension.yaml):

| Field | Notes |
| --- | --- |
| `auth.tenantId` | Your Microsoft Entra tenant ID. |
| `environmentId`, `agentIdentifier` | Values from step 2. |
| `cloud` | `Prod` (default), `Gov`, `High`, `DoD` or `Mooncake`. |
| `agentType` | `Published` (default) or `Prebuilt`. |
| `description` | **Most important field** — Dragon Copilot selects the agent from it. State clearly *when* to use the agent. |
| `timeout` | Seconds to wait for the agent (agents are slower than APIs; 30–60 is typical). |
| `runtimeParamBindings` | Flat list for agent types. `target: intent` (default) adds a labelled value to the query sent to the agent; `target: sideChannel` sends it as activity metadata. |

Copilot Studio tools have **no** `endpoint`, `expose` or `customExtractors`; the agent's reply is used as the response text.

## 4. Validate, package and onboard

```bash
dragon-copilot conversational validate extension.yaml
dragon-copilot conversational package --manifest extension.yaml
```

Then upload the package in the Dragon admin center — see [Onboarding](../../../README.md#-onboarding).

## Test prompt

> "When is the next available appointment for a follow-up visit?"

If the agent is not selected, make the tool `description` more explicit about when it should be used and confirm the agent is published in the referenced environment.
