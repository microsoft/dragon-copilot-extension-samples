# Synced CLI sources

Code in this folder is **not owned by the sandbox**. `radiologists/` is a verbatim
copy of the Dragon Copilot CLI's pure manifest core
(`tools/dragon-copilot-cli/src/domains/radiologists/manifest/`), copied in by
`server/scripts/sync-schemas.ts` before `npm run dev`, `npm run build`, and
`npm test`. The copy is git-ignored, so the CLI holds the single source of truth.

The sandbox's `POST /api/cli/generate` endpoint calls into it so that manifests
created from the Manifest Editor's **Generate Manifest** button are identical to
those produced by `dragon-copilot radiologists init` / `generate --template`.

**Do not edit these files here** — changes belong in the CLI and would be
overwritten on the next sync. `server/src/__tests__/schema-sync.test.ts` fails if
the copy drifts from the CLI source.
