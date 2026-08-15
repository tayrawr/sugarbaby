# Agent Guidelines for SugarBaby

Welcome to the **SugarBaby** codebase. SugarBaby is a friction-free, local-first web application for feline blood glucose, insulin, feeding, and diabetes monitoring.

## Architecture Principles & Patterns

1. **Local-First with Dexie (IndexedDB)**:
   - Client is the source of truth. All data modifications are committed to Dexie immediately.
   - Deletions create a tombstone in the `tombstones` table so deletions can replicate safely to Google Drive.
2. **Decentralized Cloud Sync via Google Drive**:
   - Multi-device syncing is performed against a single JSON file (`SugarBaby_Household.json`) stored in Google Drive.
   - 3-way conflict resolution uses ISO 8601 timestamps (`updatedAt`).
3. **Lossless mg/dL Storage**:
   - All blood glucose values are stored internally as integers in `mg/dL`. Conversion to `mmol/L` is strictly a presentation-layer operation.
4. **12-Hour Therapeutic Cycles**:
   - Logs are segmented into AM/PM 12-hour cycles calculated relative to dose events or scheduled injection times.

## Agent skills

### Issue tracker

Issues and specs are tracked via GitHub Issues on `tayrawr/sugarbaby` using the `gh` CLI. See `docs/agents/issue-tracker.md`.

### Triage labels

Canonical triage roles mapped to standard GitHub labels (`ready-for-agent`, `needs-triage`, etc.). See `docs/agents/triage-labels.md`.

### Domain docs

Single-context layout (`CONTEXT.md` + `docs/adr/`). See `docs/agents/domain.md`.
