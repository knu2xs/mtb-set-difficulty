# Design

## Context

The project now contains a TypeScript/Vite application and OpenSpec artifacts.
The app loads the public Black Hills trail layer and validates its configured
name and difficulty fields. It loads the complete public "Black_Hills_AOI"
web map item `064fd02902764584b781ce4b5b145f80`, including its AOI
operational layers. The editable trail layer and selection highlight are
added above the saved layers. See `proposal.md` for the
motivation and
`specs/public-trail-editing/spec.md` for the behavior contract.

The app must work without visitor sign-in and will edit a public ArcGIS Online
feature service directly. Therefore the application cannot identify an
individual contributor or keep its client-side controls from being bypassed.
Treat service schema and capabilities as runtime configuration and validate
the published layer before enabling editing. Basemap availability and
attribution are verified by loading the public web map item at runtime.

## Goals / Non-Goals

**Goals:**

- Keep the client small, responsive, accessible, and straightforward to host
  as a static web application.
- Use ArcGIS metadata as the source for trail features, field validation, and
  difficulty choices.
- Send a narrow update payload and verify the service's per-feature edit
  result.
- Make service configuration and operational prerequisites explicit and
  testable before public release.

**Non-Goals:**

- Building authentication, a moderation queue, or a backend proxy.
- Publishing or administering the ArcGIS Online feature service from the app.
- Guaranteeing contributor identity, abuse prevention, or atomic conflict
  resolution in a public client.

## Decisions

### Browser application with ArcGIS Maps SDK for JavaScript and Calcite

Use the ArcGIS Maps SDK for JavaScript for the map and feature-service
interaction, with Calcite Design System components for responsive interface
controls. Keep the application's state and validation in the app rather than
relying on a particular editing widget to enforce field restrictions. Choose
mutually compatible supported package versions during project initialization
and pin them in the dependency manifest.

**Alternatives considered:** Leaflet or another open-source map renderer could
display ArcGIS data, but would require more custom integration for this
ArcGIS-centric editing workflow. A heavier UI framework is not required for the
small public editor and remains an implementation choice if later needs justify
it.

### Static client configuration and no privileged credentials

Load a documented, public configuration containing the specific layer URL,
name field, difficulty field, and optional initial extent and basemap. Discover
the object ID and field/domain metadata from the layer. Do not include
privileged credentials or tokens in source, environment variables exposed to
the browser, or build output. Fail closed for editing when configured fields
or layer capabilities do not match expectations.

**Alternatives considered:** A server proxy could centralize controls or
authentication, but would introduce a service to operate and still could not
reliably identify anonymous contributors without an identity mechanism. It
does not solve the agreed no-auth requirement by itself.

### Restrict edits in the service, not just the UI

Configure the ArcGIS Online public editing layer or view for attribute updates
only; disable adding, deleting, geometry updates, and editing fields other than
the configured name and difficulty. Submit updates using the layer's supported
edit operation with the feature object ID and only changed permitted
attributes. Display difficulty labels but submit the corresponding
service-defined coded values, preserving their value types. Check individual
edit results before reporting success.

Every publicly accessible endpoint that can modify the same source data must
be reviewed for a more permissive bypass. Test successful and forbidden
operations as unauthenticated direct service requests on a safe test layer or
disposable records. Treat acceptance of invalid domain values or unauthorized
updates as a release blocker unless service-side enforcement is verified or
the scope is explicitly revised.

**Alternatives considered:** Hiding controls or filtering outgoing attributes
in the browser alone is insufficient because callers can invoke the public
service directly. A moderation workflow would reduce live-edit risk but
changes the agreed behavior.

### Best-effort stale-edit detection

Capture the selected feature's original name and difficulty. Before saving,
query those values again; if either changed, show a conflict and require the
visitor to reload and review rather than silently overwrite. If the check
fails, do not claim it succeeded or submit the stale values.

This is not atomic compare-and-swap. Another caller can edit after the
re-query but before the update, so last-write-wins remains possible. Document
this limitation. An atomic conditional operation is not assumed unless
supported and verified for the published service.

### Test service before production configuration

Develop against test doubles or a separate test service until the actual
service is published. Add unit tests for metadata, validation, payload shape,
conflicts, and errors; add integration tests for anonymous service permissions
and domain enforcement. Never run destructive negative-operation tests
against live trail records.

**Alternatives considered:** Waiting to begin app development until the
production service exists would unnecessarily block UI and client validation
work. The service-specific integration/release checks still cannot be
completed until a representative layer is available.

## Risks / Trade-offs

- **Anonymous vandalism or erroneous edits** → Enforce narrow service
  permissions, test direct anonymous requests, maintain a verified backup and
  recovery procedure, and assign an owner to review and respond. These
  controls reduce risk but do not prevent every abuse case.
- **Edits cannot be attributed to individual visitors** → State this clearly
  to the service owner; do not imply user identity or auditability. Revisit
  sign-in or moderation if attribution becomes necessary.
- **Public layer access or basemap use may require credentials, incur costs,
  or have terms/limits** → Verify anonymous access, attribution, licensing,
  credits, and expected usage before deployment; select a compatible basemap.
- **Domain, subtype, or field schema differs from assumptions** → Validate
  actual metadata and explicitly support subtype-specific coded domains or
  block difficulty editing with a clear configuration error.
- **A client-side freshness check has a race** → Document best-effort
  behavior; do not claim atomic conflict prevention.
- **A permissive endpoint bypasses the intended layer/view settings** →
  Review all endpoints backed by the same data and test edits directly before
  release.
- **Feature service may accept invalid domain values from direct callers** →
  Test against a safe service configuration and do not release public editing
  until domain enforcement is verified or the requirement is reconsidered.

## Migration Plan

1. Initialize the web project and implement against fixtures or a separate
   test service; keep production editing disabled until the release checks pass.
2. Publish/configure the ArcGIS Online trail layer and populate project
   configuration with the verified URL, field names, and any required map
   settings.
3. Configure public service permissions and field restrictions. Verify
   anonymous queries, permitted updates, rejected add/delete/geometry/other
   field edits, invalid domain codes, and recovery using safe test records.
4. Deploy the application to the selected host only after the actual service
   passes the release gate. Verify the deployed app at desktop and mobile
   viewport sizes.
5. To roll back the web app, redeploy the previous static build or disable the
   public application. This does not undo edits already made directly to the
   service; recover data using the service owner's tested backup/restore
   procedure. If abuse is suspected, the owner must also disable public editing
   at the service.

## Open Questions

- What is the published feature layer URL, exact name and difficulty field
  names, and are difficulty domains subtype-specific?
- Which basemap and initial extent should be used, and are they accessible
  anonymously under the intended licensing and usage terms?
- Which static host and deployment process will be used?
- Who owns service administration, edit review, monitoring, and data recovery?
- Does the target ArcGIS Online organization permit the intended anonymous
  editing configuration, and does it enforce the required field and domain
  restrictions against direct requests?
