# MTB Trail Difficulty

Responsive public trail map and name/difficulty editor. The app reads its
ArcGIS Online feature-layer settings from [`public/app-config.json`](./public/app-config.json).
The production feature service has not yet been published; do not deploy the
placeholder configuration as a working app.

## Local development

Requirements: Node.js 22.20 or newer and npm.

```sh
npm install
npm run dev
```

The app loads trail data from `trailLayerUrl` and loads the complete public web
map identified by `basemapWebMapItemId`; `nameField` and `difficultyField`
must match the feature layer. The editable trail layer and selection highlight
are added above the saved web map's operational layers.
Use a safe test service while developing and testing editing.
Selecting a trail highlights it in magenta with a white outline; selecting
another trail moves the highlight, and clicking an empty map area clears it.
Trail names and difficulties appear in the trail details pane; map pop-ups
are disabled.

Run tests and build:

```sh
npm test
npm run build
```

## Public configuration

`public/app-config.json` is downloaded by every browser visitor. It must not
contain passwords, privileged tokens, or other confidential values.

| Key | Required | Description |
| --- | --- | --- |
| `trailLayerUrl` | Yes | HTTPS URL for the specific feature layer, including its layer ID. |
| `nameField` | Yes | Exact field name (not alias) for the trail name. |
| `difficultyField` | Yes | Exact field name (not alias) for difficulty; the layer must expose a coded-value domain. |
| `initialExtent` | No | Map extent as `xmin`, `ymin`, `xmax`, `ymax`, and positive integer `wkid`; when omitted, use the layer extent. |
| `basemapWebMapItemId` | Yes | 32-character item ID of a publicly accessible web map. The app loads its basemap and operational layers. |

The current configuration points to the supplied public layer and the
"Black_Hills_AOI" web map, including its AOI operational layer group. Confirm
basemap attribution, licensing, availability,
and any usage costs before deployment. The app validates configuration syntax;
it also validates the loaded service schema and capabilities at runtime.

## ArcGIS Online service prerequisites

The public feature service is the source of truth. Configure the service to
allow anonymous updates to the name and difficulty attributes only. Disable
feature creation, deletion, geometry updates, and editing any other field at
the service level. Set difficulty's coded-value domain on the service; the app
uses the service's labels and codes rather than maintaining a second list.
The configured trail layer publishes `mtb_scale_imba` as both its type ID field
and a coded-value field domain. The app accepts this feature-type configuration
only when the type IDs exactly match that field's coded values and there are no
type-specific overrides for difficulty.

The current public layer metadata advertises `Create,Delete,Query,Update,Editing`
capabilities, although geometry updates are disabled. This does not establish
that anonymous callers can successfully create or delete features, but it does
mean those operations must be tested directly before enabling public editing.
If the hosted feature layer view cannot enforce the intended restrictions,
do not use it as an anonymous editing endpoint; use a backend that validates
and authorizes the permitted updates instead.

Verify those restrictions, invalid-domain handling, and any other public
endpoint backed by the same data with direct anonymous requests against a
separate test service or disposable features. Do not use destructive negative
tests on production trails. A public editing service can be called without the
app, and anonymous changes cannot be reliably attributed to a visitor.
Establish a tested recovery process and an owner to review edits before public
release. See [`openspec/changes/public-trail-editor/`](./openspec/changes/public-trail-editor/)
for the full behavior specification and release checklist.

Before each save, the app re-queries the selected trail's name and difficulty
and blocks the update if either differs from the values originally loaded.
This is a best-effort stale-edit check, not an atomic concurrency guarantee:
another edit can still occur between the check and the update request. Service
permissions and a recovery process remain essential.
