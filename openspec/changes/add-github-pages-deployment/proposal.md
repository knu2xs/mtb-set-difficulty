# Proposal

## Why

The project has a local production build but no GitHub workflow to publish it. Automating deployment gives maintainers a repeatable way to update the public site from `main` and to build a selected branch on demand.

## What Changes

- Build and publish the site to GitHub Pages on pushes to `main` once publishing is enabled.
- Add a **Run workflow** option in GitHub Actions. A manual run on `main` builds and publishes; a manual run on another branch builds without publishing.
- Make the Vite bundle and public runtime configuration load under the GitHub Pages project path without changing root-hosted local development.
- Document one-time Pages setup and preserve the existing public-editing release prerequisites. Adding the workflow does not itself authorize a public launch.

## Capabilities

### New Capabilities

- `site-publishing`: Automated and on-demand builds and branch-scoped publishing of the static site to GitHub Pages.

### Modified Capabilities

## Impact

Affects GitHub Actions, repository Pages settings, Vite build paths, the runtime configuration loader and its tests, and deployment documentation. No changes to the trail editing behavior, ArcGIS service permissions, or data are in scope. Generated `dist/` output remains untracked.
