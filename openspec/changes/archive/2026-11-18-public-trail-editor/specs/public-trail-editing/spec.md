# Spec Delta

## Purpose

This capability lets the public browse mountain bike trails and contribute
limited corrections to existing trail names and difficulty ratings through an
ArcGIS Online feature service.

## ADDED Requirements

### Requirement: Load the configured trail layer

The application SHALL load its public trail layer and editable field names from
project configuration and validate the metadata needed to display and edit
trails.

#### Scenario: Valid layer configuration

- **GIVEN** a public, compatible trail layer and valid configuration
- **WHEN** a visitor opens the application
- **THEN** the map displays the layer in the configured extent or its valid
  layer extent
- **AND** the app resolves the configured name and difficulty fields and the
  layer's object ID and update capability.

#### Scenario: Invalid or incomplete layer configuration

- **GIVEN** a missing URL, inaccessible layer, missing configured field,
  incompatible field type, absent usable extent, or unavailable update
  capability
- **WHEN** the app initializes or validates the layer
- **THEN** it displays an actionable configuration or service error
- **AND** it does not enable edits that depend on the invalid or missing
  capability.

### Requirement: Browse and select existing trails

The application SHALL let visitors inspect an existing trail's current name
and difficulty by selecting its feature on the map.

#### Scenario: Select a trail

- **GIVEN** the trail layer has loaded
- **WHEN** a visitor selects a trail feature
- **THEN** the app identifies that feature and displays its current name and
  difficulty.

#### Scenario: Select a location without a trail

- **GIVEN** the trail layer has loaded
- **WHEN** a visitor selects a location without an editable trail feature
- **THEN** the app does not open an editor for a different feature or submit an
  edit.

### Requirement: Edit only existing trail names and difficulty

The application SHALL let visitors update only the configured name and
difficulty attributes of an existing trail and SHALL submit only changed
permitted attributes.

#### Scenario: Save a valid update

- **GIVEN** a selected existing trail and valid changed values for one or both
  permitted fields
- **WHEN** a visitor saves the update
- **THEN** the app submits an update identified by the feature's object ID
- **AND** includes only the changed name and/or difficulty attributes, with no
  geometry or unrelated attributes
- **AND** shows the updated feature and a success message only after the
  service confirms the edit succeeded.

#### Scenario: Save without changes

- **GIVEN** a visitor has not changed either permitted value
- **WHEN** they attempt to save
- **THEN** the app sends no edit request and indicates that there is nothing to
  save.

#### Scenario: Unsupported operations through the app

- **WHEN** a visitor uses the application
- **THEN** it provides no controls for adding or deleting trails, changing
  geometry, or editing other attributes.

### Requirement: Use the service's difficulty domain

The application SHALL populate difficulty choices from the selected feature's
applicable coded-value domain and submit the domain code with its original
value type. Feature types are supported when their type ID field is the
configured difficulty field, every type ID matches a coded-value domain code,
and no type-specific difficulty domain overrides exist.

#### Scenario: Choose a valid difficulty

- **GIVEN** the selected feature has a supported coded-value domain
- **WHEN** a visitor edits difficulty
- **THEN** the app displays the domain labels and submits the corresponding
  code without changing its string or numeric type.

#### Scenario: Existing difficulty is null or unrecognized

- **GIVEN** the selected feature has a null or unrecognized difficulty value
- **WHEN** the app displays the trail or its editor
- **THEN** the existing value is identified as missing or unrecognized
- **AND** is not presented as a valid new domain choice.

#### Scenario: Domain is absent or unsupported

- **GIVEN** the applicable domain is absent, is not coded-value, or cannot be
  resolved for the feature's subtype
- **WHEN** a visitor attempts to edit difficulty
- **THEN** the app blocks that edit and explains the configuration problem
- **AND** does not guess or hard-code difficulty choices.

#### Scenario: Difficulty is also the feature type ID field

- **GIVEN** each feature type ID matches a code in the configured difficulty
  field's coded-value domain
- **AND** no feature type overrides the difficulty domain
- **WHEN** a visitor edits difficulty
- **THEN** the app uses the field domain's labels and codes for its choices.

### Requirement: Validate names and difficulty values

The application SHALL validate proposed attribute values before submitting an
edit.

#### Scenario: Invalid name

- **GIVEN** the proposed name is empty after trimming or exceeds the field's
  advertised maximum length
- **WHEN** the visitor attempts to save
- **THEN** the app identifies the invalid name and submits no edit request.

#### Scenario: Invalid difficulty choice

- **GIVEN** the proposed difficulty code is not in the applicable domain
- **WHEN** the visitor attempts to save
- **THEN** the app rejects the value and submits no edit request.

### Requirement: Detect stale trail values before saving

The application SHALL check the latest name and difficulty before submitting
an edit and SHALL avoid knowingly overwriting changes made since the visitor
opened the editor.

#### Scenario: Trail changed since editor opened

- **GIVEN** the selected trail's name or difficulty changed since the editor
  opened
- **WHEN** the visitor attempts to save
- **THEN** the app does not submit the stale edit
- **AND** explains the conflict, retains the unsaved values, and offers a way
  to reload the current trail for review.

#### Scenario: Latest values cannot be checked

- **GIVEN** the app cannot retrieve the latest feature values before saving
- **WHEN** the visitor attempts to save
- **THEN** it reports the failure and does not claim that a stale-edit check
  succeeded.

### Requirement: Report editing outcomes accurately

The application SHALL communicate edit progress and distinguish successful
updates from validation, service, network, and conflict failures.

#### Scenario: Update is in progress

- **WHEN** an edit request is in progress
- **THEN** the app displays a progress state and prevents duplicate submission.

#### Scenario: Update fails

- **GIVEN** the service rejects the request, an individual edit result reports
  failure, or a network error occurs
- **WHEN** the visitor saves
- **THEN** the app explains that the update failed, preserves unsaved input
  where possible, and offers an appropriate retry or reload action
- **AND** does not show a success message.

### Requirement: Support responsive and accessible editing

The application SHALL provide an operable trail selection and editing
experience on mobile and desktop viewports and for keyboard and assistive
technology users.

#### Scenario: Edit on a narrow viewport

- **GIVEN** a narrow mobile viewport
- **WHEN** a visitor opens the trail editor
- **THEN** the fields, save control, and status messages are visible or
  reachable without horizontal page scrolling
- **AND** the visitor can return to the map.

#### Scenario: Use the editor without a pointer

- **GIVEN** a visitor navigates with a keyboard or screen reader
- **WHEN** they use the form
- **THEN** controls have accessible names, focus is visible, validation and
  save status are announced, and all form actions are keyboard operable.

### Requirement: Enforce anonymous edit restrictions at the service

The public ArcGIS Online editing service SHALL permit anonymous updates only
to the configured name and difficulty attributes of existing trails and SHALL
reject other edit operations.

#### Scenario: Valid anonymous attribute update

- **GIVEN** a test service configured with the intended public permissions
- **WHEN** an unauthenticated caller updates a permitted field on an existing
  trail
- **THEN** the update succeeds and is confirmed by querying the feature again.

#### Scenario: Anonymous caller attempts an unauthorized edit

- **GIVEN** a test service configured for public editing
- **WHEN** an unauthenticated caller attempts to add or delete a feature,
  change geometry, or change any other attribute
- **THEN** the service denies the operation or the unauthorized change is not
  applied, as verified by querying the affected data.

#### Scenario: Invalid domain code is submitted directly

- **GIVEN** a test service with the configured difficulty coded-value domain
- **WHEN** an unauthenticated caller submits a difficulty code outside that
  domain directly to the service
- **THEN** the service rejects the value or the invalid value is not persisted.

#### Scenario: A more permissive endpoint could bypass the editor

- **GIVEN** another public layer or service endpoint can edit the same source
  trail data
- **WHEN** the service owner validates the production configuration
- **THEN** that endpoint is also restricted or otherwise prevented from
  bypassing the intended edit limits before the application is released.

### Requirement: Prepare for safe public operation

The application SHALL not be released for public editing until its real
feature service has passed safe anonymous-access tests and an owner recovery
procedure is established.

#### Scenario: Real service is not yet available

- **GIVEN** the production feature service has not been published or
  configured
- **WHEN** the application is developed and tested
- **THEN** tests use a test service or representative test doubles
- **AND** production release remains blocked pending validation of the actual
  service's schema, permissions, allowed edits, rejected edits, and recovery
  process.

#### Scenario: Direct negative tests are performed

- **GIVEN** unauthorized edit operations must be tested
- **WHEN** the service owner runs the tests
- **THEN** tests use a separate test service or designated disposable features
- **AND** do not risk destructive changes to production trail records.
