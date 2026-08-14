# Local-First Offline Storage with Dexie.js

Caregivers need instantaneous zero-latency logging and full offline availability while handling pet treatments. We decided to use IndexedDB wrapped by Dexie.js with typed entity repositories and export/import capabilities. This ensures zero load time, reliable persistent client-side storage, and a clean abstraction layer for optional future multi-device sync providers.
