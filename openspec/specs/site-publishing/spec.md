# site-publishing Specification

## Purpose

Provide a repeatable way to build the static trail map and publish approved versions from `main` to GitHub Pages.

## Requirements

### Requirement: Automatic build on main

GitHub Actions SHALL build the pushed revision when a push updates `main`.

#### Scenario: Main receives a push
- **WHEN** a commit is pushed to `main`
- **THEN** GitHub Actions starts a build for that revision without manual intervention

#### Scenario: Another branch receives a push
- **WHEN** a commit is pushed to a branch other than `main`
- **THEN** the Pages workflow does not start automatically

### Requirement: On-demand build

Maintainers SHALL be able to start a build from GitHub Actions and select a branch that contains the workflow.

#### Scenario: Maintainer dispatches a branch build
- **WHEN** a maintainer selects a branch in **Run workflow**
- **THEN** GitHub Actions builds the revision selected by the dispatch

### Requirement: Publish only successful main builds

Once Pages publishing is enabled for public release, GitHub Actions SHALL publish the static output of successful push-triggered and manually dispatched builds on `main` and report the deployed URL. Other refs and failed builds MUST NOT publish.

#### Scenario: Eligible main build succeeds
- **WHEN** a push-triggered or manually dispatched build on `main` succeeds and Pages publishing is enabled
- **THEN** the workflow publishes that build's output to GitHub Pages and exposes the site URL

#### Scenario: Manually dispatched non-main build succeeds
- **WHEN** a manually dispatched build on a branch other than `main` succeeds
- **THEN** the run reports build success without deploying to Pages or changing the published site

#### Scenario: Main build fails
- **WHEN** a build on `main` fails
- **THEN** the failure is visible in GitHub Actions and the published site is not updated

### Requirement: Site works at the Pages project path

The published site SHALL load its entry page, bundled assets, and public runtime configuration from its GitHub Pages project path, while local development continues to work at the root path.

#### Scenario: Visitor opens the Pages site
- **WHEN** a visitor opens the deployed project URL
- **THEN** the app loads its assets and public runtime configuration under the project's URL prefix

#### Scenario: Developer opens the local app
- **WHEN** a developer starts the local development server with default settings
- **THEN** the app loads its assets and public runtime configuration without a repository URL prefix
