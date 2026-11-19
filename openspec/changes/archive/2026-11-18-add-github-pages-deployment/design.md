# Design

## Context

The project is a Vite/TypeScript static site. `npm run build` type-checks and writes `dist/`; the npm lockfile is checked in and `dist/` is ignored. Vite currently builds for `/`, and `src/config.ts` fetches `/app-config.json` explicitly. The default Pages project URL will serve the site beneath `/mtb-set-difficulty/`. The public trail editor's service validation and recovery checks are still release prerequisites.

## Goals / Non-Goals

**Goals:** Use one workflow for both triggers, isolate deployment privileges from the build, and make the GitHub-hosted and local builds use the appropriate URL prefix.

**Non-Goals:** Add a custom domain, publish branch previews, or provision or modify the ArcGIS service.

## Decisions

1. **Build once and deploy the same output.** A workflow in `.github/workflows/` triggers on pushes to `main` and on `workflow_dispatch`. The build job uses Node 22 (at least 22.20), runs `npm ci`, `npm test`, and `npm run build`, and uploads `dist/` through GitHub's official Pages artifact action for eligible publishing runs. A dependent deploy job uses the official Pages deployment action and exposes its URL through the `github-pages` environment. This avoids a generated `gh-pages` branch and a second build that could differ from the tested one.
2. **Restrict publishing to `main` and require explicit release enablement.** Check the full ref `refs/heads/main` for upload and deploy, restrict the `github-pages` environment to `main`, and keep `pages: write` and `id-token: write` on the deploy job only. Require a repository setting such as `PAGES_PUBLISH_ENABLED=true` to publish; leave it unset initially. This keeps both trigger paths buildable before Pages is configured and avoids treating a successful client build as evidence of service readiness. Serialize `main` workflow runs separately from manual runs on other refs so deploys cannot race; GitHub may replace queued runs during bursts.
3. **Set the Pages base at build time.** Derive the project path from the GitHub repository name and pass it as the Vite build base in the workflow. Use Vite's `BASE_URL` for the runtime configuration request and keep the default local base `/`. This avoids hardcoding the repository path in application code or requiring Pages metadata to build when publishing is disabled. A custom domain or user-site root would need an explicit base adjustment.

## Risks / Trade-offs

- **A successful build can still fail at the Pages URL.** Verify that the entry point, bundled assets, and `app-config.json` load under the repository prefix, and that local development still uses `/`.
- **Publishing exposes the runtime configuration and links visitors to a live editable service.** Keep secrets out of the artifact and do not enable publishing until the existing release checklist confirms safe anonymous permissions, basemap readiness, and an owner recovery procedure. A Pages rollback does not undo trail edits.

## Migration Plan

1. Land the workflow and path changes with publishing disabled. Confirm that GitHub shows the manual trigger and that build-only runs succeed. GitHub requires the workflow on the default branch for manual dispatch, and a selected branch must contain the workflow.
2. After the existing release prerequisites pass, set **Settings > Pages > Source** to **GitHub Actions**, restrict the `github-pages` environment to `main`, and enable the publishing setting. Dispatch from `main` for the first release if no push is pending, then verify the reported URL.
3. To stop future deployments, disable the publishing setting. To remove an already published site, unpublish Pages separately. To roll back the site, revert the faulty change on `main` and deploy that revision.
