---
name: project-update
description: "Update this project's npm dependencies, pnpm pins, pnpm-workspace overrides and SHA-pinned GitHub Actions to their latest stable releases. Checks every version, rewrites package.json, the workflow, Dockerfile and pnpm-workspace.yaml, refreshes the lockfile, verifies lint/tests/build and records what each update taught. WHEN: update packages, update dependencies, update npm packages, update GitHub Actions, bump versions, upgrade dependencies, latest versions, pnpm outdated, upgrade pnpm, dependency update, security update."
---

# Update the project

Versions live in five places:

- `package.json`: `dependencies`, `devDependencies`, `engines.node` (minimum), `engines.pnpm` (minimum) and `packageManager` (only when present).
- `.github/workflows/deploy.yml`: every `uses: owner/repo[/subpath]@<full SHA> # vX.Y.Z`, plus the pnpm `with: version` and `node-version`.
- `Dockerfile`: `FROM node:26-alpine` and `RUN npm install -g pnpm@x.y.z`.
- `pnpm-workspace.yaml`: the `overrides` block (`brace-expansion`).
- Prose and comments that name a version. `.github/dependabot.yml` is configuration, not a pin: leave it alone.

`project-update.js` reads all of these, asks npm and GitHub for the latest stable release, and prints what is behind. It uses the npm registry, the `/releases/latest` redirect on github.com and `git ls-remote`, so it needs no token and no GitHub API quota.

Project-specific facts:

- There is no `packageManager` field, so pnpm does **not** switch versions by itself.
- The pinned pnpm appears in the workflow, the Dockerfile and `engines.pnpm`; all three move together.
- The globally installed pnpm may be older than `engines.pnpm` (see Findings): run every install, test and build through `npx --yes pnpm@<pin>`.

Read **Findings** below before updating: it is what earlier updates learned.

## Steps

1. Health-check the skill first: `node .agents/skills/project-update/project-update.js --check`. Every case must be `ok`. If one fails, fix the skill before updating anything.
2. Start from a known state: `git status --short`. Do not revert changes you did not make. Node and git must be installed; dependencies do not need to be.
3. Report only:

   ```powershell
   node .agents/skills/project-update/project-update.js
   ```

   The table shows `current -> latest (major|minor|patch)` for packages, `pnpm-workspace.yaml` overrides, the pnpm pin and GitHub Actions. The **Node.js** block reports the newest release, the latest LTS, `engines.node`, the workflow `node-version` and the Dockerfile base image.
4. Decide about **major** updates before writing anything. Read their release notes (npm page, GitHub releases). A major can need code changes, a newer Node or a new ESLint config. Leave one out with `--skip <name>`; tell the user why. Never mix a skipped package into the same `--write` run.
   - `engines.node` and `engines.pnpm` are minimums the project supports, not targets: the script raises the pnpm floor to stay in sync with the pin, and never touches `engines.node`.
   - Node `node-version` and the Dockerfile `node:` tag are report-only. Change them by hand only after the lint/test/build steps pass and the release is stable (no `-alpha`, `-beta`, `-rc`).
5. Apply:

   ```powershell
   node .agents/skills/project-update/project-update.js --write
   ```

   It rewrites the versions in `package.json`, the pnpm pin in the workflow and Dockerfile, the `engines.pnpm` floor, the `pnpm-workspace.yaml` overrides, and every pinned action (SHA **and** `# tag` comment). It writes nothing else.
6. Refresh the lockfile with the pinned pnpm, not the global one:

   ```powershell
   npx --yes pnpm@<pinned-version> install
   ```

   Use the version printed for the pnpm update (or the existing pin when pnpm was already current). pnpm 12 appends a `minimumReleaseAgeExclude` list to `pnpm-workspace.yaml` when a fresh release is younger than its supply-chain policy; keep that list in the working tree (see Findings).
7. Validate, again through the pinned pnpm:

   ```powershell
   npx --yes pnpm@<pinned-version> run lint
   npx --yes pnpm@<pinned-version> run test
   npx --yes pnpm@<pinned-version> run build
   ```

   All three must pass. If a major broke the build, revert that package with `git checkout -- package.json pnpm-lock.yaml` and redo the run with `--skip`.
8. Update prose that hardcodes a version: `rg 'pnpm 12|Node 26|vite 8|jsdom 31' README.md Dockerfile .github`. `README.md` only says "Node.js (LTS recommended)" today, but comments in the Dockerfile/workflow name the sync points.
9. Review the diff: `git diff --stat` and `git diff pnpm-lock.yaml`. The lockfile may change far more than the `package.json` specifiers: a pnpm bump rewrites peer suffixes and transitive resolutions (see Findings). Check that every changed `specifier` and `version` under `importers` is intended; never edit the lockfile by hand.
10. Format: `npx --yes pnpm@<pinned-version> exec prettier --write package.json pnpm-workspace.yaml .github/workflows .agents/skills/project-update`.
11. Run the checker again: it must end with **Everything is up to date.** and no errors.
12. **Learn before finishing**: follow the self-improvement loop below. Then summarize every version that moved, what was skipped and why, and what changed in this skill. Do not commit or push unless the user asks.

## Self-improvement (required on every run)

The skill gets better one dated finding and one regression case at a time. A **finding** is anything this run did not handle on its own:

- an update the script missed, or a package/action/override reported with the wrong version or bump type;
- an action whose release tag and commit disagree, a tag that is not a commit, a subpath action, a workflow syntax the parser ignores;
- a version source the script does not know (a new file, a new `engines` field, a new override);
- a major that needed code, docs or lockfile work;
- an error from npm, github.com, git, npx or pnpm, or a command whose output changed;
- a step of this file that was wrong, missing or unclear, or a manual fix you had to make.

Before finishing **every** run:

1. **Fix the cause** in `project-update.js`, never the symptom. Read versions; never hardcode a current version.
2. **Prove it** with a regression case in `references.json`:
   - reuse an existing `fn` whenever possible;
   - if the fix adds a pure function, register it in `CHECKS` and give the case `fn`, `input`, `expect` and `why`;
   - use the real values that failed (version, tag, workflow line) so the case reproduces the bug offline.
3. **Run** `node .agents/skills/project-update/project-update.js --check`. A failure means the fix or the case is wrong; do not continue until it passes.
4. **Record it** with `node .agents/skills/project-update/project-update.js --learn "<one-sentence finding>"`. It appends a dated line to **Findings** and refuses duplicates.
5. **Re-run the update check** so the report matches the new behavior. Repeat the normal Steps if the fix changes the result.

If the run taught nothing, say so in the summary; do not invent a finding. The check suite is the skill's memory: a fix without a case in `references.json` will be lost the next time the script is rewritten.

### Regression functions

`references.json` calls these pure functions: `parseVersion`, `compareVersions`, `bumpType`, `isStable`, `isReleaseTag`, `nextSpec`, `parseUseLine`, `renderActionUse`, `tagFromReleaseUrl`, `pickCommit`, `isCurrentPin`, `findPnpmVersionPin`, `findPnpmDockerPin`, `nextEngineRange`, `parseOverrides`, `renderOverrideLine`, `planPnpmPins`.

Never store tokens or other secrets in the skill, and never edit `pnpm-lock.yaml` by hand.

## Options

| Option | Default |
| --- | --- |
| `--write` | report only |
| `--skip <a,b>` | nothing (package name, `pnpm` or `owner/repo`) |
| `--check` | run the offline regression suite |
| `--learn "<text>"` | append a dated finding to `SKILL.md` |
| `--help` | show usage |

## What the script checks

- Every `dependencies` and `devDependencies` entry, through `https://registry.npmjs.org/<name>/latest`. The `^`/`~` prefix is kept; prereleases are ignored.
- The `overrides` in `pnpm-workspace.yaml`, the same way.
- pnpm wherever it is pinned: `packageManager` (if present), the `pnpm/action-setup` step's `with: version`, the Dockerfile's `npm install -g pnpm@...`, and the floor of `engines.pnpm`. The floor keeps its upper bound (`>=12.16.1 <13` becomes `>=12.18.0 <13`).
- Every `uses: owner/repo[/subpath]@...` in `.github/workflows`. The latest release tag comes from the `/releases/latest` redirect, but only when it is a plain semver tag; otherwise (for example `github/codeql-action` redirecting to `codeql-bundle-v2.27.4`) the highest stable semver tag wins. The commit comes from `git ls-remote --tags`, preferring the peeled `^{}` commit for annotated tags.
- Node.js releases, for information only: newest stable and latest LTS from `https://nodejs.org/dist/index.json`, compared with the workflow `node-version`, the Dockerfile base image and `engines.node`.
- With `--check`: every case in `references.json` plus the hygiene of this file (LF, a Findings section with dated entries, at least one case, a skill-local `package.json` that marks the script as ESM). Offline, fast, no network.

## Findings

- 2026-11-09: `uses:` can include a subpath (`github/codeql-action/upload-sarif`). Parse the whole action for rewriting, but query releases on the first two segments only; the original `owner/repo@` regex silently skipped it.
- 2026-11-09: `github/codeql-action`'s `/releases/latest` redirects to `codeql-bundle-v2.27.4`, not the action tag. Only trust plain semver release tags; otherwise take the highest stable semver tag from `git ls-remote`.
- 2026-11-09: This repo has no `packageManager`, so pnpm pins live in the workflow `with: version`, the Dockerfile `npm install -g pnpm@` and the `engines.pnpm` floor. They must move together or CI, the image and local installs disagree.
- 2026-11-09: The globally installed pnpm (11.22.0) does not satisfy `engines.pnpm` (`>=12.16.1 <13`) and pnpm cannot self-switch without `packageManager`; `pnpm install` fails with `ERR_PNPM_UNSUPPORTED_ENGINE`. Run install, lint, test and build through `npx --yes pnpm@<pin>`.
- 2026-11-09: `pnpm-workspace.yaml` is a version source too (`overrides: brace-expansion`). Treat it like a dependency and keep its quotes and indentation.
- 2026-11-09: The parsing and pinning rules had no offline tests, so a rewrite could silently change them. references.json and `--check` are the skill's memory: every fixed bug gets a case.
- 2026-11-09: Bumping pnpm rewrote about 2,800 lockfile lines (peer suffixes and transitive resolutions) even with the same dependency set; review the importers specifier/version lines instead of line counts.
- 2026-11-09: pnpm 12 appends a minimumReleaseAgeExclude list to pnpm-workspace.yaml when a release is younger than its supply-chain policy; keep and commit it (19 entries on this run).
- 2026-11-09: applyPnpmPins must tolerate a null pnpm update; --write would throw when only packages or actions were behind. It now plans pins through planPnpmPins and includes a regression case.
- 2026-11-09: Node warns MODULE_TYPELESS_PACKAGE_JSON because the skill script is ESM in a project without a type field; the skill-local package.json sets type module and --check verifies it.
