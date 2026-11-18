# Proposal

## Why

Mountain bikers need a simple way to view trail information and contribute corrections to trail names and difficulty ratings. The ArcGIS Online feature service has not yet been published, so the application must keep its service URL and field names configurable and derive difficulty choices from the service schema.

## What Changes

- Build a responsive public web app with the ArcGIS Maps SDK for JavaScript and Calcite Design System.
- Display trail features from a configurable public ArcGIS Online feature layer and let visitors select a trail.
- Allow anonymous visitors to directly update only existing trails' name and difficulty attributes; derive difficulty choices from the layer's coded-value domain.
- Require service-level restrictions that prevent anonymous callers from adding or deleting features, changing geometry, or editing other fields.
- Provide clear loading, validation, success, and error states, along with service configuration, testing, and recovery guidance.

## Capabilities

### New Capabilities

- `public-trail-editing`: Public trail browsing and anonymous, attribute-only updates of existing trail names and difficulty values using the configured ArcGIS Online feature layer.

### Modified Capabilities

None.

## Impact

- New application code and configuration in the project root.
- New ArcGIS Maps SDK for JavaScript and Calcite dependencies.
- Public ArcGIS Online hosted feature layer or appropriately configured layer view; the configured service URL, schema, and domain are validated at runtime.
- Anonymous edits are direct and live. The client cannot authenticate or reliably identify contributors; service permissions, direct-request tests, recovery, and owner review are release prerequisites.
- Hosting, monitoring, source trail dataset, and production release validation remain to be decided. The app uses the complete public "Black_Hills_AOI" web map item `064fd02902764584b781ce4b5b145f80`, including its AOI operational group.
