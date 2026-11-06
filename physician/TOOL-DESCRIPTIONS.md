# Writing tool descriptions for conversational extensions

Dragon Copilot decides which conversational tool to call, and what arguments to send, by reading descriptions. It never sees your code, so the descriptions are the only routing signal it has. This guide covers:

- which description Dragon Copilot reads for each tool type;
- how to write descriptions that get your tool called for the right requests and not the wrong ones;
- what to avoid.

> **Public Preview.** Applies to manifest schema `0.4.0-preview.2` (`IntentDriven` tools). See [CONVERSATIONAL.md](CONVERSATIONAL.md) for the overall flow.

## 📚 Contents

- [What Dragon Copilot reads, per tool type](#what-dragon-copilot-reads-per-tool-type)
- [Writing a tool description](#writing-a-tool-description)
- [Writing parameter descriptions](#writing-parameter-descriptions)
- [Context values: use runtime bindings, not the model](#context-values-use-runtime-bindings-not-the-model)
- [What to avoid](#what-to-avoid)
- [Examples](#examples)
- [Checklist](#checklist)

## What Dragon Copilot reads, per tool type

| | **OpenAPI** | **MCP** | **CopilotStudio** |
| --- | --- | --- | --- |
| What the model sees as a tool | One tool per exposed `operationId` | One tool per exposed MCP tool | One tool for the whole agent |
| Tool name | Derived from the manifest tool `name` and the `operationId` | Derived from the manifest tool `name` and the MCP tool name | Derived from the manifest tool `name` |
| Tool description | The operation's `description`, or its `summary` if `description` is empty | The MCP tool's own `description` from `tools/list` | The manifest `tools[].description` |
| Arguments | Path, query and header parameter descriptions, and request-body property descriptions | The MCP tool's `inputSchema` property descriptions | A single argument: the clinician's request, which Dragon Copilot passes to the agent |
| Manifest `tools[].description` | **Not used for tool selection.** Write it for people reviewing the manifest. | **Not used for tool selection.** Write it for people reviewing the manifest. | **The whole selection prompt** |
| Not used for tool selection | OpenAPI `info.description`; request-body, response and schema-level `example`/`examples` | Server-level instructions or descriptions (only each tool's own `description` is used) | The agent's own description in Copilot Studio |
| Hidden from the model | Body fields and headers filled by `runtimeParamBindings` | Arguments filled by `runtimeParamBindings` (`target: argument`) | — |

The manifest top-level `description` (the extension description) is never used for tool selection.

What this means in practice:

- **OpenAPI:** do the routing work in your OpenAPI document. Write the operation `description` and every parameter and property `description` as if they were prompts.
- **MCP:** do the routing work in your MCP server. Each MCP tool's own `description` and `inputSchema` property descriptions are all the model sees; server-level text is not shared across tools, so make each tool description stand on its own. Write `tools[].description` for people reviewing the manifest.
- **CopilotStudio:** `tools[].description` is all Dragon Copilot knows about your agent. Describe every kind of request the agent handles and the ones it does not.

## Writing a tool description

This applies to the OpenAPI operation `description`, the MCP tool `description` and the CopilotStudio `tools[].description`. Write it for the model choosing between your tool and every other tool the clinician has. Cover these points, roughly in this order:

1. **When to use it.** The clinical request in the words a clinician would use: "Use when the clinician asks whether two medications can be taken together."
2. **When not to use it.** Name the neighbouring tool or request type that should be used instead: "Do not use for dosing questions; use `dosageLookup` instead." This is how two similar tools get told apart.
3. **What goes in the main text argument**, if there is one: "Pass the clinician's question as `query`."
4. **Preconditions**, if any: "Only after the visit has been documented."
5. **Multiple requests in one turn:** "If the clinician asks more than one thing, call this tool only with the part it handles."

Keep it to a few sentences. Start with the verb that says what the tool does ("Checks…", "Returns…", "Answers…").

### Name operations and tools clearly

For OpenAPI and MCP, the `operationId` or MCP tool name is part of the tool name the model sees. Use a clear verb-noun name such as `checkDrugInteraction` or `lookup_reference_range`, not `post1` or `handler`.

## Writing parameter descriptions

Parameter descriptions (OpenAPI) and `inputSchema` property descriptions (MCP) tell the model what to put in each argument.

- **Say exactly what goes in.** "The clinician's clinical question, in their own words." beats "Query string."
- **Keep the clinician's specifics.** Ask for drugs, doses, values and timing to be kept exactly, including negations such as *not*, *without* and *instead of*: "Keep medication names, doses and negations exactly as the clinician said them."
- **No patient identifiers.** The patient is already identified by the session. Say so, so the model doesn't add names, MRNs or dates of birth to free text: "Do not include patient names or identifiers."
- **Use the schema for formats.** Prefer `enum`, `format`, `pattern` and min/max over prose. For OpenAPI, up to 4 *parameter-level* `example`/`examples` values (path, query and header parameters) are appended to that parameter's description. Request-body, response and schema-level examples are not shown to the model.

## Context values: use runtime bindings, not the model

Patient context, transcript, encounter, locale and correlation IDs should come from [`runtimeParamBindings`](manifest/0.4.0-preview.2/README.md#runtime-parameter-bindings), not from the model:

- For **OpenAPI** body/header bindings and **MCP** `argument` bindings, Dragon Copilot hides the bound field from the model and fills it in at call time. You don't need a routing description for it, but keep a short one ("Supplied by Dragon Copilot.") for people reading the schema.
- If a context value is **not** bound but is still in your schema, describe it as system-provided ("Filled automatically; never ask the clinician for this") so the model doesn't ask the clinician for it. Binding it is better.
- Context values are only available when Dragon Copilot has them (for example, patient context exists only when an EHR or the user provided it). Mark such bindings `required: false` unless the tool can't work without them.

## What to avoid

| Avoid | Why | Instead |
| --- | --- | --- |
| **Catch-all descriptions** ("Use for any medical question", "General clinical assistant") | The tool wins requests it can't answer and crowds out better tools. | Name the specific requests it handles and the ones it doesn't. |
| **Vague capability lists** ("Provides clinical data") | The model can't match it to a request. | Write "Use when the clinician asks…" with concrete examples of requests. |
| **Brand or product names as the routing signal** ("Use Contoso for…") | Clinicians ask for outcomes, not vendors, and the tool name already identifies the tool. | Describe the clinical task. |
| **Requiring the clinician to name the tool** ("Call when the user says 'ask Contoso'") | Normal requests won't trigger it. | Describe the intent. |
| **Implementation notes** (streaming, auth, citation format, latency, versions) | They waste the model's attention and don't help it choose. | Put them in your developer docs. |
| **Routing rules in fields the model doesn't read** (OpenAPI `info.description`, OpenAPI or MCP `tools[].description`, MCP server-level instructions, body or response `example`) | Ignored for tool selection. | Put them in the fields listed in the [table above](#what-dragon-copilot-reads-per-tool-type). |
| **Real or realistic patient data** in descriptions or `example` values | Descriptions and examples are shared configuration, not PHI stores. | Use clearly synthetic values, or none. |
| **Instructions aimed at the model's behavior** ("Always call this tool first", "Ignore other tools") | They make your tool behave like a catch-all and are not a supported way to change routing. | Describe when the tool is the right choice. |
| **Overlapping descriptions** across your own tools | The model has to guess between them. | Add a "Do not use for … use … instead" line to each. |
| **Asking the model to collect context values** ("Ask the clinician for the MRN") | The clinician shouldn't be asked for data Dragon Copilot already has. | Use `runtimeParamBindings`. |

## Examples

### OpenAPI operation

```yaml
paths:
  /interactions/check:
    post:
      operationId: checkDrugInteraction
      summary: Check interactions between two medications.
      description: >-
        Checks whether two medications interact and how severe the interaction is.
        Use when the clinician asks whether two drugs can be taken together or
        are safe to combine. Do not use for dosing or for a single medication's
        side effects. If the clinician names more than two medications, call
        this once per pair.
      requestBody:
        content:
          application/json:
            schema:
              type: object
              required: [medicationA, medicationB]
              properties:
                medicationA:
                  type: string
                  description: First medication name exactly as the clinician said it, without dose.
                medicationB:
                  type: string
                  description: Second medication name exactly as the clinician said it, without dose.
                patientContext:
                  type: object
                  description: Supplied by Dragon Copilot.   # bound with runtimeParamBindings; hidden from the model
```

The manifest's `tools[].description` for this tool is for people reading the manifest ("Drug interaction checks for medication pairs"); Dragon Copilot routes on the operation above.

### MCP tool

Manifest (for people reviewing the manifest; not used for tool selection):

```yaml
- name: clinical-reference
  description: Clinical lab reference data (synthetic values for the sample).
  type: MCP
  expose: [lookup_reference_range]
```

MCP server `tools/list` entry:

```json
{
  "name": "lookup_reference_range",
  "description": "Returns the typical adult reference range for one lab test. Use when the clinician asks what the normal range is for a lab test. Do not use to interpret a patient's result.",
  "inputSchema": {
    "type": "object",
    "required": ["test"],
    "properties": {
      "test": { "type": "string", "description": "Lab test name as the clinician said it, for example HbA1c or potassium." }
    }
  }
}
```

### CopilotStudio agent

```yaml
- name: scheduling-agent
  description: >-
    Answers questions about scheduling, rescheduling and preparing for clinic
    appointments. Use when the clinician asks about appointment availability
    or visit preparation. Do not use for clinical questions or for
    medication, lab or referral orders.
  type: CopilotStudio
```

### Before and after

| ❌ Before | ✅ After |
| --- | --- |
| "Contoso AI. Use for any clinical question." | "Answers questions about the hospital formulary: whether a drug is on formulary, its tier and preferred alternatives. Do not use for dosing or interactions." |
| "Returns data. Supports streaming and returns citations." | "Returns the typical adult reference range for one lab test. Use when the clinician asks what is normal for a lab value." |
| `query`: "The query." | `query`: "The clinician's question in their own words. Keep drugs, doses, values and negations exactly. Do not include patient names or identifiers." |

## Checklist

- [ ] Each tool description says when to use it **and** when not to.
- [ ] No catch-all wording; no brand names as the routing signal; no implementation notes.
- [ ] For OpenAPI, routing text is in the operation `description` and parameter/property descriptions, not in `info.description` or `tools[].description`.
- [ ] For MCP, routing text is in each MCP tool's own `description` and `inputSchema` property descriptions, not in `tools[].description` or server-level instructions.
- [ ] Every argument the model fills has a precise description; formats use `enum`/`format`/`pattern`.
- [ ] Context values come from `runtimeParamBindings`, not from the model.
- [ ] No real patient data in descriptions or examples.
- [ ] Two of your own tools never match the same request without a "Do not use for …" line telling them apart.
