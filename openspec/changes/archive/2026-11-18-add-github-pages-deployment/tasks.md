# Tasks

## 1. Support project-path hosting

- [x] 1.1 Resolve the runtime configuration URL using Vite's base URL; update the configuration tests to cover both `/app-config.json` and `/mtb-set-difficulty/app-config.json` and verify they pass.
- [x] 1.2 Build with the Pages base and preview under `/mtb-set-difficulty/`; verify the page, generated assets, and `app-config.json` load under that prefix. Verify default local development still loads at `/`.

## 2. Add the GitHub Actions workflow

- [x] 2.1 Add `main` push and manual dispatch triggers. Build the selected revision with a compatible Node 22 release, `npm ci`, `npm test`, and `npm run build` using the repository-derived base. Verify the trigger filters and that the build produces `dist/index.html` and `dist/app-config.json`.
- [x] 2.2 Upload only `dist/` and deploy it using the official Pages actions. Verify the job dependency, full-ref check, explicit publishing setting, deploy-only write permissions, `main` concurrency, and deployed URL wiring with workflow validation and review of the trigger and failure paths.
- [x] 2.3 Add README instructions for manual dispatch, Pages source, `main` environment protection, the publishing setting, existing service readiness checks, and rollback. Verify the documented names and defaults against the workflow.

## 3. Verify the GitHub rollout

- [x] 3.1 With publishing disabled, verify a push to `main` and a manual dispatch start successful build-only runs. Verify a non-main push does not invoke this workflow and a manual non-main run does not publish.
- [x] 3.2 Once the existing public release checks pass and a maintainer enables publishing, verify that a push to `main` and a manual dispatch from `main` each publish and expose the project URL. Confirm a manual non-main run does not change the live site and smoke-test page, bundle, and configuration loading at the deployed URL.
