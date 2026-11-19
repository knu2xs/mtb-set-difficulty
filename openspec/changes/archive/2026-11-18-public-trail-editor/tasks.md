# Tasks

## 1. Project foundation and configuration

- [x] 1.1 Scaffold a small TypeScript browser application and add compatible ArcGIS Maps SDK for JavaScript and Calcite dependencies; verify the lockfile is created and the production build succeeds.
- [x] 1.2 Define and implement validated public configuration for the layer URL, name field, difficulty field, optional extent, and basemap; add configuration tests and document placeholder values, required metadata, and the absence of secrets.

## 2. Map and trail browsing

- [x] 2.1 Implement map initialization, anonymous layer loading, configured-or-layer extent handling, and actionable loading/configuration errors; verify with a mock or test feature layer covering valid and invalid metadata.
- [x] 2.2 Implement trail feature selection and a responsive trail details panel; add tests for selecting a feature and an empty hit test, and document the expected public layer configuration.

## 3. Attribute editing and validation

- [x] 3.1 Implement metadata-driven name validation and difficulty choices, including typed coded values, legacy values, and subtype-specific domain handling or explicit rejection; add unit tests for each supported and rejected case.
- [x] 3.2 Implement attribute-only updates by object ID, sending only changed permitted fields and checking the individual service edit result; add tests that assert no geometry or unrelated attributes are sent and no request is sent for unchanged values.
- [x] 3.3 Implement accessible validation, in-progress, success, and failure states with duplicate-submit prevention and unsaved-value retention; add tests for validation failures, service/network failures, and accurate success reporting.

## 4. Conflict handling and accessible responsive UI

- [x] 4.1 Implement the pre-save freshness check and stale-value conflict flow; add tests for changed values, failed re-query, and reload/review behavior, and document that the check is best-effort rather than atomic.
- [x] 4.2 Complete responsive Calcite-based map/editor interactions and keyboard/screen-reader behavior; verify at narrow and desktop viewports and test accessible names, focus order, and announced validation/save status.

## 5. Service readiness and release

- [x] 5.1 Document and verify the ArcGIS Online service setup checklist against a safe test layer: public query access, anonymous update access, attribute-only updates, allowed name/difficulty fields, disabled add/delete/geometry edits, domain behavior, and review of other endpoints for bypasses.
- [x] 5.2 Run anonymous direct-service tests on disposable test data for a valid update, add/delete attempts, geometry and unrelated-field edits, and invalid domain codes; verify outcomes by re-querying data and block public release on any unauthorized persisted change.
- [x] 5.3 Record the production layer URL/schema/domain, basemap attribution and anonymous access, hosting choice, service owner, and verified backup/recovery procedure; verify the application is configured without secrets and production release is blocked until every release gate passes.
- [x] 5.4 Run the full project build, targeted tests, and lint; deploy a preview to the selected host and verify the end-to-end browse/edit flow at desktop and mobile sizes using a safe test service.
