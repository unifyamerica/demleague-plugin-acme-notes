# @unifyamerica/demleague-plugin-acme-notes

Example DemLeagueOS plugin, namespace `acme.notes`, and **the template for third-party plugins**. It gives
each user private notes in each of their organizations, and creates a welcome note when a user joins an
organization (`core.organization.member-added`). It has an API part (`src/`, entry `.`) and a SPA UI (`src/ui/`, entry
`./ui`).

Endpoints are mounted at `/plugins/acme/notes`. Notes are kept per organization (the request's `X-Tenant`):

| Method | Path | Who |
| --- | --- | --- |
| GET | `/health` | public (approved in the registry) |
| GET / POST | `/notes` | members and org admins of the organization (`Note` ability) |
| GET / PATCH / DELETE | `/notes/:id` | same, own notes only (others' are 404) |
| GET | `/overview` | org admins (`Overview` is granted to `org_admin`): the organization's note counts |

The UI adds a **Notes** page to the sidebar and a **Notes overview** page (org admins only) to the account menu.
Both live under `/apps/acme/notes` and work in the organization picked in the SPA's header.

## Operations other modules can call

Other modules reach notes only through these exported operations (`exports` in `src/manifest.ts`,
implemented in `src/notes/notes.exports.ts`), called through the host's `ModuleCallsProxy`. Each runs for the
caller's acting user, in the current organization, on that user's own notes, and needs the same ability as the
matching endpoint:

| Operation | Who may call it | Ability | Input | Result |
| --- | --- | --- | --- | --- |
| `notes.list` | any module the core team approves (`'*'`) | `read Note` | `{ limit?: 1–50 (10), pinned?: boolean }` or nothing | `{ id, title, pinned, updatedAt (ISO) }[]`, pinned first, then latest |
| `notes.create` | `acme.tasks` | `create Note` | `{ title: 1–200 chars, body?: ≤ 10,000 chars, pinned?: boolean }` | `{ id, title }`; emits `acme.notes.note-created` |

Invalid input is a `PluginValidationError` (400). These shapes are a public API: they change only by adding new
operations. [demleague-plugin-acme-tasks](https://github.com/unifyamerica/demleague-plugin-acme-tasks) is the
example caller.

## Building with an AI agent

[`PLUGIN_AI_CONTEXT.md`](PLUGIN_AI_CONTEXT.md) is the plugin contract written for AI coding agents (Claude
Code, the Claude app, …). Give it to your agent as its instructions (for example as `CLAUDE.md`), then
describe your module with the feature specification template at its end. It comes along when you start a
new plugin from this repository. The full reference for people is the
[Plugin Developer Guide](https://github.com/unifyamerica/demleague-plugin-sdk/blob/main/PLUGIN_DEVELOPER_GUIDE.md).

## Starting a new plugin from this one

Each plugin lives in its own repo in the `unifyamerica` GitHub org, named like its package:
`unifyamerica/demleague-plugin-<vendor>-<module>` for `@unifyamerica/demleague-plugin-<vendor>-<module>`.
The core team creates it from this repository and adds the vendor as an outside collaborator on that repo only.

1. In the new repo, rename the package to `@unifyamerica/demleague-plugin-<vendor>-<module>` (it must be
   `@unifyamerica/<repo name>`) and the namespace to `<vendor>.<module>`. Point `repository` at the new repo
   (`git+https://github.com/unifyamerica/<repo name>.git`, no `directory`): GitHub links the package to its
   repo through it. Keep `publishConfig` (`"registry": "https://npm.pkg.github.com"`) and `.npmrc`, which maps
   `@unifyamerica` to GitHub Packages. Put your token (`read:packages`) in your user `~/.npmrc`, never in the
   repo.
2. Keep `@unifyamerica/demleague-plugin-sdk`, `@nestjs/common`, `class-validator` and `class-transformer` as
   **peerDependencies**, and `vue` and `primevue` as optional ones if you have a UI. A bundled copy breaks
   dependency injection, silently skips validation or loads a second Vue.
3. Declare everything in `src/manifest.ts`, which imports from `@unifyamerica/demleague-plugin-sdk/manifest` so the UI
   can use it too: permissions, endpoints, collections, events, limits, `abilities` (who may do what, per
   organization role), `ui.slots` (the SPA menus you add entries to), and, if your module works with others,
   `exports` (operations other modules may call; drop `notes.exports.ts` and the template's `exports` if you
   offer none) and `calls` (other modules' operations you call; see
   [demleague-plugin-acme-tasks](https://github.com/unifyamerica/demleague-plugin-acme-tasks)). Keep its `version` in sync with
   `package.json`; a spec checks this.
4. Keep the ESLint guardrails (`eslint.config.mjs`):
   - the API part may only import the packages above (never another plugin's package: call its exported
     operations instead)
   - the UI may only import `@unifyamerica/demleague-plugin-sdk/vue`, `vue`, `primevue`, `primeicons`, its own files and
     the manifest
   - no `process.env`, `eval` or `require`
   - no iframes in the UI (nor `frame`, `object`, `embed`), in templates, render functions or
     `createElement()`, and no raw HTML (`v-html`, `innerHTML`, `insertAdjacentHTML`, `document.write`). The
     SPA's CSP (`frame-src 'none'`) blocks them anyway.
5. Write unit tests with `@unifyamerica/demleague-plugin-sdk/testing` (Jest, `src/**/*.spec.ts`) and
   `@unifyamerica/demleague-plugin-sdk/vue/testing` (Vitest, `src/ui/**/*.spec.ts`).
6. Build with `npm run build` (it clears `dist/` first):
   - `tsc` builds the API part to `dist/`
   - Vite builds the UI to `dist/ui/` as an ES module library, with the platform packages external
   - `vue-tsc` writes the UI's declarations to `dist/ui-types/`
7. Keep the release workflow, `.github/workflows/release.yml`:

   ```yaml
   name: Release
   on:
     push:
       tags: ['v*']
   permissions:
     contents: read
     packages: write
     id-token: write
     attestations: write
   jobs:
     release:
       uses: unifyamerica/demleague-plugin-workflows/.github/workflows/plugin-release.yml@main
   ```

   To release, bump `version` in `package.json` and the manifest, then push a `v<version>` tag. The workflow
   checks the repo, package, `repository` and tag names, runs lint, type-check, tests and the build, then attests the
   tarball and publishes it to GitHub Packages. Don't `npm publish` yourself: DemLeagueOS only installs
   packages that workflow attested.
8. Ask the core team to install it. They open the PR on DemLeagueOS that:
   - pins the exact version in `api/package.json` (and `frontend/package.json` for the UI)
   - adds the module to `api/src/plugins.config.ts` and the `./ui` entry to `frontend/src/plugins.config.ts`
   - adds the namespace, permissions, public endpoints, ability grants (`approvedAbilityGrants`), UI
     slots (`approvedUiSlots`) and calls to other modules (`approvedCalls`) you request to
     `api/namespace-registry.json`

`.github/workflows/ci.yml` runs the same checks on every push and pull request. The shared release
workflow lives in [demleague-plugin-workflows](https://github.com/unifyamerica/demleague-plugin-workflows),
and the SDK in [demleague-plugin-sdk](https://github.com/unifyamerica/demleague-plugin-sdk).

## Scripts

`npm run build`, `npm test` (Jest + Vitest), `npm run lint`, `npm run type-check` (`tsc` + `vue-tsc`)
