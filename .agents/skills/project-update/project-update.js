/**
 * Keeps this project's dependencies, pnpm pins, pnpm overrides and
 * SHA-pinned GitHub Actions on their latest stable releases.
 *
 *   node .agents/skills/project-update/project-update.js [options]
 *
 * Without --write it only reports. --check runs the offline regression suite
 * in references.json. Run with --help for the options.
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { isDeepStrictEqual, parseArgs, promisify } from 'node:util';
import { fileURLToPath } from 'node:url';

const SKILL_DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(SKILL_DIR, '../../..');
const PACKAGE_JSON = path.join(ROOT, 'package.json');
const WORKFLOWS_DIR = path.join(ROOT, '.github', 'workflows');
const DOCKERFILE = path.join(ROOT, 'Dockerfile');
const PNPM_WORKSPACE = path.join(ROOT, 'pnpm-workspace.yaml');
const SKILL_MD = path.join(SKILL_DIR, 'SKILL.md');
const REFERENCES = path.join(SKILL_DIR, 'references.json');
const USER_AGENT = 'project-update-skill';
const execFileAsync = promisify(execFile);
// Action references may carry a subpath, e.g. github/codeql-action/upload-sarif.
const USES_RE =
  /^(\s*(?:-\s+)?uses:\s*)([A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+(?:\/[A-Za-z0-9_.-]+)*)@([^\s#]+)(\s*#\s*(\S+))?(\s*)$/;

const USAGE = `Usage: node .agents/skills/project-update/project-update.js [options]

  --write          Apply the updates (default: report only)
  --skip <a,b>     Names to leave alone (package name, pnpm or owner/repo)
  --check          Run the offline regression checks in references.json
  --learn "<text>" Append a dated finding to SKILL.md and exit
  --help           Show this help

Updates dependencies and devDependencies in package.json, the pnpm version
and Node floor in engines, the pnpm pin in the workflow and Dockerfile, the
overrides in pnpm-workspace.yaml, and every SHA-pinned action in
.github/workflows. It does not run pnpm install, tests or the build.`;

const { values: opts } = parseArgs({
  options: {
    write: { type: 'boolean', default: false },
    skip: { type: 'string', default: '' },
    check: { type: 'boolean', default: false },
    learn: { type: 'string' },
    help: { type: 'boolean', default: false }
  }
});

if (opts.help) {
  console.log(USAGE);
  process.exit(0);
}

const skip = new Set(
  opts.skip
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)
);
const errors = [];

function requestJson(url) {
  return fetch(url, { headers: { 'User-Agent': USER_AGENT } }).then(
    async (response) => {
      if (!response.ok) {
        const error = new Error(
          `${response.status} ${response.statusText}: ${url}`
        );
        error.status = response.status;
        throw error;
      }
      return response.json();
    }
  );
}

async function git(args) {
  const { stdout } = await execFileAsync('git', args, {
    maxBuffer: 10 * 1024 * 1024
  });
  return stdout;
}

function parseVersion(value) {
  const match = /(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z.-]+))?/.exec(value || '');
  if (!match) return null;
  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
    prerelease: match[4] || ''
  };
}

function compareVersions(a, b) {
  for (const key of ['major', 'minor', 'patch']) {
    if (a[key] !== b[key]) return a[key] < b[key] ? -1 : 1;
  }
  if (a.prerelease === b.prerelease) return 0;
  if (!a.prerelease) return 1;
  if (!b.prerelease) return -1;
  return a.prerelease.localeCompare(b.prerelease);
}

function bumpType(current, latest) {
  if (current.major !== latest.major) return 'major';
  if (current.minor !== latest.minor) return 'minor';
  return 'patch';
}

function isStable(version) {
  return !String(version).includes('-');
}

// A release tag we can trust as this action's version. github/codeql-action
// publishes codeql-bundle-* releases too; those are not action versions.
function isReleaseTag(tag) {
  return /^v?\d+\.\d+\.\d+$/.test(tag || '');
}

function nextSpec(spec, latest) {
  const prefix = spec.startsWith('~') ? '~' : spec.startsWith('^') ? '^' : '';
  return `${prefix}${latest}`;
}

function indentOf(line) {
  return /^\s*/.exec(line)[0].length;
}

function parseUseLine(line) {
  const match = USES_RE.exec(line);
  if (!match) return null;

  const action = match[2];
  const parts = action.split('/');
  return {
    prefix: match[1],
    action,
    repo: parts.slice(0, 2).join('/'),
    ref: match[3],
    comment: match[5] || '',
    suffix: match[6]
  };
}

function renderActionUse(update) {
  return `${update.prefix}${update.action}@${update.sha} # ${update.tag}${update.suffix}`;
}

function tagFromReleaseUrl(url) {
  try {
    const match = /\/releases\/tag\/(.+)$/.exec(new URL(url).pathname);
    return match ? decodeURIComponent(match[1]) : null;
  } catch {
    return null;
  }
}

function pickCommit(output, tag) {
  const lines = output
    .split('\n')
    .map((line) => line.split('\t'))
    .filter(([sha, ref]) => sha && ref);
  const peeled = lines.find(([, ref]) => ref === `refs/tags/${tag}^{}`);
  const direct = lines.find(([, ref]) => ref === `refs/tags/${tag}`);
  const found = peeled || direct;

  if (!found) throw new Error(`tag ${tag} not found`);
  return found[0];
}

function isCurrentPin(ref, comment, sha, tag) {
  return (
    /^[0-9a-f]{40}$/i.test(ref) &&
    ref.toLowerCase() === sha.toLowerCase() &&
    comment === tag
  );
}

// The pnpm/action-setup step pins pnpm with `with: version: x.y.z`. Find that
// line without matching an unrelated `version:` key in the same workflow.
function findPnpmVersionPin(text) {
  const lines = text.split('\n');
  const useIndex = lines.findIndex((line) =>
    /uses:\s*pnpm\/action-setup@/.test(line)
  );
  if (useIndex < 0) return null;

  const useIndent = indentOf(lines[useIndex]);
  for (let index = useIndex + 1; index < lines.length; index += 1) {
    const line = lines[index];
    if (!line.trim() || /^\s*#/.test(line)) continue;

    const indent = indentOf(line);
    if (indent < useIndent) break;
    if (indent === useIndent && /^\s*-\s/.test(line)) break;

    const match = /^(\s*)version:\s*['"]?(\d+\.\d+\.\d+)['"]?\s*$/.exec(line);
    if (match) return { index, version: match[2] };
  }

  return null;
}

function findPnpmDockerPin(text) {
  const lines = text.split('\n');
  for (let index = 0; index < lines.length; index += 1) {
    const match =
      /^(\s*)RUN\s+npm\s+install\s+-g\s+pnpm@(\d+\.\d+\.\d+)\s*$/i.exec(
        lines[index]
      );
    if (match) return { index, version: match[2] };
  }
  return null;
}

// Keep the operator and any upper bound: ">=12.16.1 <13" -> ">=12.18.0 <13".
function nextEngineRange(range, version) {
  const floor = /^(\s*>=\s*)(\d+\.\d+\.\d+)(.*)$/.exec(range || '');
  if (floor) return `${floor[1]}${version}${floor[3]}`;
  if (/^\d+\.\d+\.\d+$/.test(range || '')) return version;
  return range;
}

function parseOverrides(text) {
  const lines = text.split('\n');
  const start = lines.findIndex((line) => /^overrides:\s*$/.test(line));
  if (start < 0) return [];

  const overrides = [];
  for (let index = start + 1; index < lines.length; index += 1) {
    const line = lines[index];
    if (!line.trim() || /^\s*#/.test(line)) continue;
    if (indentOf(line) === 0) break;

    const match = /^(\s+)([^\s:#][^:]*):\s*(['"]?)([^'"\s]+)\3\s*$/.exec(
      line
    );
    if (match) {
      overrides.push({
        name: match[2].trim(),
        spec: match[4],
        index,
        indent: match[1].length,
        quote: match[3]
      });
    }
  }
  return overrides;
}

function renderOverrideLine(update) {
  return `${' '.repeat(update.indent)}${update.name}: ${update.quote}${update.latest}${update.quote}`;
}

/**
 * Self-checks. Every case in references.json names one of these functions and
 * compares its result with the expected value. They must stay pure and offline.
 */
const CHECKS = {
  parseVersion,
  compareVersions: ({ a, b }) =>
    compareVersions(parseVersion(a), parseVersion(b)),
  bumpType: ({ current, latest }) =>
    bumpType(parseVersion(current), parseVersion(latest)),
  isStable,
  isReleaseTag,
  nextSpec: ({ spec, latest }) => nextSpec(spec, latest),
  parseUseLine,
  renderActionUse,
  tagFromReleaseUrl,
  pickCommit: ({ output, tag }) => pickCommit(output, tag),
  isCurrentPin: ({ ref, comment, sha, tag }) =>
    isCurrentPin(ref, comment, sha, tag),
  findPnpmVersionPin,
  findPnpmDockerPin,
  nextEngineRange: ({ range, version }) => nextEngineRange(range, version),
  parseOverrides,
  renderOverrideLine,
  planPnpmPins
};

function runSelfChecks() {
  let failures = 0;
  const checks = JSON.parse(fs.readFileSync(REFERENCES, 'utf8')).checks || [];
  const ids = new Set();

  const fail = (label, detail) => {
    failures += 1;
    console.log(`  FAIL  ${label}`);
    if (detail) console.log(`        ${detail}`);
  };
  const pass = (label) => console.log(`  ok    ${label}`);

  console.log('Self-check');
  for (const check of checks) {
    if (!check.id || ids.has(check.id)) {
      fail(check.id || '(missing id)', 'id is missing or duplicated');
      continue;
    }
    ids.add(check.id);

    if (!check.why) {
      fail(check.id, 'why is missing');
    } else if (!CHECKS[check.fn]) {
      fail(check.id, `unknown fn: ${check.fn}`);
    } else if (!Object.hasOwn(check, 'input')) {
      fail(check.id, 'input is missing');
    } else if (!Object.hasOwn(check, 'expect')) {
      fail(check.id, 'expect is missing');
    } else {
      try {
        const actual = CHECKS[check.fn](check.input);
        if (isDeepStrictEqual(actual, check.expect)) pass(check.id);
        else
          fail(
            check.id,
            `expected ${JSON.stringify(check.expect)}, received ${JSON.stringify(actual)}`
          );
      } catch (error) {
        fail(check.id, error.message);
      }
    }
  }

  const skill = fs.readFileSync(SKILL_MD, 'utf8');
  const skillPackage = path.join(SKILL_DIR, 'package.json');
  let skillType = null;
  try {
    skillType = JSON.parse(fs.readFileSync(skillPackage, 'utf8')).type;
  } catch {
    skillType = null;
  }
  const hygiene = [
    ['SKILL.md uses LF line endings', !skill.includes('\r\n')],
    ['SKILL.md has a Findings section', /^## Findings$/m.test(skill)],
    [
      'SKILL.md has at least one dated finding',
      /^- \d{4}-\d{2}-\d{2}: \S/m.test(skill)
    ],
    ['references.json has at least one check', checks.length > 0],
    ['skill-local package.json marks ESM', skillType === 'module']
  ];

  for (const [label, ok] of hygiene) {
    if (ok) pass(label);
    else fail(label);
  }

  console.log('');
  if (failures > 0) {
    console.log(`${failures} self-check(s) failed.`);
    return 1;
  }
  console.log(`All ${checks.length + hygiene.length} self-checks passed.`);
  return 0;
}

function today() {
  const date = new Date();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

function learn(text) {
  const finding = text.trim().replace(/\s+/g, ' ');
  if (!finding) throw new Error('--learn needs a one-line finding');

  const entry = `- ${today()}: ${finding}`;
  const skill = fs.readFileSync(SKILL_MD, 'utf8');
  if (skill.split('\n').includes(entry)) {
    console.log('Already recorded.');
    return;
  }

  const heading = '\n## Findings\n';
  const start = skill.indexOf(heading);
  if (start < 0) throw new Error('SKILL.md has no "## Findings" section');

  const next = skill.indexOf('\n## ', start + heading.length);
  const head = next < 0 ? skill : skill.slice(0, next);
  const tail = next < 0 ? '' : skill.slice(next);
  const separator = head.endsWith('\n') ? '' : '\n';

  fs.writeFileSync(SKILL_MD, `${head}${separator}${entry}\n${tail}`);
  console.log(`Recorded: ${entry}`);
}

if (opts.check) {
  process.exit(runSelfChecks());
}

if (opts.learn !== undefined) {
  try {
    learn(opts.learn);
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
  process.exit(0);
}

async function latestPackage(name) {
  return (await requestJson(`https://registry.npmjs.org/${encodeURIComponent(name)}/latest`))
    .version;
}

async function checkPackages(pkg) {
  const updates = [];

  for (const field of ['dependencies', 'devDependencies']) {
    for (const [name, spec] of Object.entries(pkg[field] || {})) {
      if (skip.has(name)) continue;

      const current = parseVersion(spec.replace(/^[~^]/, ''));
      if (!current) continue;

      try {
        const latest = await latestPackage(name);
        const next = parseVersion(latest);
        if (!next || !isStable(latest) || compareVersions(current, next) >= 0) {
          continue;
        }

        updates.push({
          name,
          field,
          spec,
          latest,
          next: nextSpec(spec, latest),
          type: bumpType(current, next)
        });
      } catch (error) {
        errors.push(`${name}: ${error.message}`);
      }
    }
  }

  return updates;
}

async function checkOverrides() {
  if (!fs.existsSync(PNPM_WORKSPACE)) return [];

  const updates = [];
  for (const override of parseOverrides(
    fs.readFileSync(PNPM_WORKSPACE, 'utf8')
  )) {
    if (skip.has(override.name)) continue;

    const current = parseVersion(override.spec.replace(/^[~^]/, ''));
    if (!current) continue;

    try {
      const latest = await latestPackage(override.name);
      const next = parseVersion(latest);
      if (!next || !isStable(latest) || compareVersions(current, next) >= 0) {
        continue;
      }

      updates.push({
        ...override,
        latest,
        type: bumpType(current, next)
      });
    } catch (error) {
      errors.push(`${override.name}: ${error.message}`);
    }
  }
  return updates;
}

function workflowFiles() {
  if (!fs.existsSync(WORKFLOWS_DIR)) return [];
  return fs
    .readdirSync(WORKFLOWS_DIR)
    .filter((name) => /\.ya?ml$/i.test(name))
    .map((name) => path.join(WORKFLOWS_DIR, name));
}

async function checkPnpmPins(pkg) {
  const pins = [];

  const manager = /^pnpm@(\d+\.\d+\.\d+)$/.exec(pkg.packageManager || '');
  if (manager) {
    pins.push({
      place: 'package.json packageManager',
      kind: 'packageManager',
      version: manager[1]
    });
  }

  for (const file of workflowFiles()) {
    const pin = findPnpmVersionPin(fs.readFileSync(file, 'utf8'));
    if (pin) {
      pins.push({
        place: `${path.relative(ROOT, file)}:${pin.index + 1}`,
        kind: 'workflow',
        file,
        index: pin.index,
        version: pin.version
      });
    }
  }

  if (fs.existsSync(DOCKERFILE)) {
    const pin = findPnpmDockerPin(fs.readFileSync(DOCKERFILE, 'utf8'));
    if (pin) {
      pins.push({
        place: `Dockerfile:${pin.index + 1}`,
        kind: 'dockerfile',
        file: DOCKERFILE,
        index: pin.index,
        version: pin.version
      });
    }
  }

  const engineRange = pkg.engines?.pnpm;
  const engineFloor = /^>=\s*(\d+\.\d+\.\d+)/.exec(engineRange || '');
  if (engineFloor) {
    pins.push({
      place: 'package.json engines.pnpm',
      kind: 'engines',
      version: engineFloor[1],
      range: engineRange
    });
  }

  const parsed = pins
    .map((pin) => ({ ...pin, parsed: parseVersion(pin.version) }))
    .filter((pin) => pin.parsed);
  if (parsed.length === 0 || skip.has('pnpm')) {
    return { pins, update: null };
  }

  try {
    const latest = await latestPackage('pnpm');
    const latestVersion = parseVersion(latest);
    if (!latestVersion || !isStable(latest)) return { pins, update: null };

    const currentPin = parsed.reduce((max, pin) =>
      compareVersions(pin.parsed, max.parsed) > 0 ? pin : max
    );
    if (compareVersions(currentPin.parsed, latestVersion) >= 0) {
      return { pins, update: null };
    }

    const enginePin = parsed.find((pin) => pin.kind === 'engines');
    const engineNext =
      enginePin && latestVersion.major === enginePin.parsed.major
        ? nextEngineRange(enginePin.range, latest)
        : null;

    return {
      pins,
      update: {
        current: currentPin.version,
        latest,
        type: bumpType(currentPin.parsed, latestVersion),
        pins: pins.filter(
          (pin) => pin.kind !== 'engines' && pin.version !== latest
        ),
        engineNext
      }
    };
  } catch (error) {
    errors.push(`pnpm: ${error.message}`);
    return { pins, update: null };
  }
}

function findActionUses() {
  const uses = [];
  for (const file of workflowFiles()) {
    const lines = fs.readFileSync(file, 'utf8').split('\n');

    lines.forEach((line, index) => {
      const parsed = parseUseLine(line);
      if (!parsed) return;

      uses.push({
        ...parsed,
        file,
        relative: path.relative(ROOT, file),
        index
      });
    });
  }
  return uses;
}

// Prefer the /releases/latest redirect, but only when it names a plain semver
// tag. github/codeql-action redirects to codeql-bundle-vX.Y.Z instead of the
// action version, so fall back to the highest stable semver tag there.
async function latestActionTag(repo) {
  try {
    const response = await fetch(`https://github.com/${repo}/releases/latest`, {
      headers: { 'User-Agent': USER_AGENT },
      redirect: 'follow'
    });
    if (response.ok) {
      const tag = tagFromReleaseUrl(response.url);
      if (isReleaseTag(tag)) return tag;
    }
  } catch {
    // Fall back to the highest tag below.
  }

  const output = await git([
    'ls-remote',
    '--tags',
    '--refs',
    `https://github.com/${repo}.git`
  ]);
  const versions = output
    .split('\n')
    .map((line) => line.split('\t')[1])
    .filter(Boolean)
    .map((ref) => ref.replace('refs/tags/', ''))
    .filter((tag) => isReleaseTag(tag))
    .map((tag) => ({ tag, version: parseVersion(tag) }))
    .filter((tag) => tag.version)
    .sort((a, b) => compareVersions(b.version, a.version));

  return versions[0]?.tag || null;
}

async function resolveCommit(repo, tag) {
  const output = await git([
    'ls-remote',
    '--tags',
    `https://github.com/${repo}.git`,
    `refs/tags/${tag}`,
    `refs/tags/${tag}^{}`
  ]);
  return pickCommit(output, tag);
}

async function checkActions() {
  const updates = [];

  for (const use of findActionUses()) {
    if (skip.has(use.repo) || skip.has(use.action)) continue;

    try {
      const tag = await latestActionTag(use.repo);
      if (!tag) continue;

      const sha = await resolveCommit(use.repo, tag);
      if (isCurrentPin(use.ref, use.comment, sha, tag)) continue;

      updates.push({
        ...use,
        tag,
        sha,
        pinned: /^[0-9a-f]{40}$/i.test(use.ref),
        type: /^[0-9a-f]{40}$/i.test(use.ref) ? 'update' : 'pin'
      });
    } catch (error) {
      errors.push(`${use.action}: ${error.message}`);
    }
  }

  return updates;
}

async function checkNode() {
  try {
    const releases = await requestJson('https://nodejs.org/dist/index.json');
    const newest =
      releases.find((release) => isStable(release.version))?.version || null;
    const lts = releases.find(
      (release) => release.lts && isStable(release.version)
    );
    return { newest, lts };
  } catch (error) {
    errors.push(`node: ${error.message}`);
    return null;
  }
}

function nodePins(pkg) {
  const flows = [];
  for (const file of workflowFiles()) {
    const content = fs.readFileSync(file, 'utf8');
    for (const match of content.matchAll(
      /node-version:\s*['"]?([^'"\s]+)['"]?/g
    )) {
      flows.push({
        file: path.relative(ROOT, file),
        version: match[1],
        major: /^(\d+)/.exec(match[1])?.[1] || null
      });
    }
  }

  let docker = null;
  if (fs.existsSync(DOCKERFILE)) {
    const match = /^FROM\s+node:(\d+)/m.exec(
      fs.readFileSync(DOCKERFILE, 'utf8')
    );
    if (match) docker = { version: match[1], major: match[1] };
  }

  return { flows, docker, engines: pkg.engines?.node || null };
}

function describeNode(pkg, nodeInfo) {
  if (!nodeInfo) return;

  const pins = nodePins(pkg);
  const ltsMajor = nodeInfo.lts
    ? String(parseVersion(nodeInfo.lts.version).major)
    : null;

  console.log('Node.js');
  console.log(`  newest release: ${nodeInfo.newest || 'unknown'}`);
  console.log(
    `  latest LTS:     ${nodeInfo.lts ? `${nodeInfo.lts.version} (${nodeInfo.lts.lts})` : 'none'}`
  );
  console.log(`  engines.node:   ${pins.engines || 'not set'} (minimum)`);
  console.log(
    `  workflows:      ${
      pins.flows.length
        ? pins.flows
            .map((pin) => `${pin.version} in ${pin.file}`)
            .join(', ')
        : 'not pinned'
    }`
  );
  console.log(
    `  Dockerfile:     ${pins.docker ? `node:${pins.docker.major}` : 'no node image'}`
  );

  const mismatched = [
    ...pins.flows.filter((pin) => pin.major !== ltsMajor).map((pin) => pin.file),
    ...(pins.docker && pins.docker.major !== ltsMajor ? ['Dockerfile'] : [])
  ];
  if (mismatched.length > 0) {
    console.log(
      `  note:           ${[...new Set(mismatched)].join(', ')} does not use the LTS major (${ltsMajor}); update it by hand after testing`
    );
  }
  console.log('');
}

function report(packageUpdates, overrideUpdates, pnpmInfo, actionUpdates) {
  console.log('Packages');
  if (packageUpdates.length === 0) {
    console.log('  up to date');
  } else {
    for (const update of packageUpdates) {
      console.log(
        `  ${update.name.padEnd(38)} ${update.spec.padEnd(12)} -> ${update.next} (${update.type})`
      );
    }
  }

  console.log('');
  console.log('Overrides (pnpm-workspace.yaml)');
  if (overrideUpdates.length === 0) {
    console.log('  up to date');
  } else {
    for (const update of overrideUpdates) {
      console.log(
        `  ${update.name.padEnd(38)} ${update.spec.padEnd(12)} -> ${update.latest} (${update.type})`
      );
    }
  }

  console.log('');
  console.log('pnpm');
  if (!pnpmInfo.update) {
    console.log(
      `  ${pnpmInfo.pins.length ? 'up to date' : 'no pin found'}${pnpmInfo.pins.length ? ` (${pnpmInfo.pins.map((pin) => pin.place).join(', ')})` : ''}`
    );
  } else {
    const { update } = pnpmInfo;
    console.log(
      `  ${update.current} -> ${update.latest} (${update.type})`
    );
    for (const pin of pnpmInfo.pins) console.log(`    ${pin.place}`);
    if (update.engineNext) {
      console.log(
        `    engines.pnpm ${pnpmInfo.pins.find((pin) => pin.kind === 'engines')?.range} -> ${update.engineNext}`
      );
    }
  }

  console.log('');
  console.log('GitHub Actions');
  if (actionUpdates.length === 0) {
    console.log('  up to date');
  } else {
    for (const update of actionUpdates) {
      const current = update.pinned ? update.comment || 'SHA' : update.ref;
      console.log(
        `  ${update.action.padEnd(38)} ${current.padEnd(12)} -> ${update.tag} (${update.type})`
      );
      console.log(`    ${update.relative}:${update.index + 1}`);
    }
  }

  console.log('');
}

function applyPackageUpdates(pkg, packageUpdates, pnpmUpdate) {
  for (const update of packageUpdates) {
    pkg[update.field][update.name] = update.next;
  }

  let touched = packageUpdates.length > 0;

  if (pnpmUpdate) {
    if (/^pnpm@/.test(pkg.packageManager || '')) {
      pkg.packageManager = `pnpm@${pnpmUpdate.latest}`;
      touched = true;
    }
    if (pnpmUpdate.engineNext && pkg.engines?.pnpm) {
      pkg.engines.pnpm = pnpmUpdate.engineNext;
      touched = true;
    }
  }

  if (touched) {
    fs.writeFileSync(PACKAGE_JSON, `${JSON.stringify(pkg, null, 2)}\n`);
  }
}

// --write can run when pnpm is already current and only packages moved.
function planPnpmPins(update) {
  return update ? update.pins : [];
}

function applyPnpmPins(pnpmUpdate) {
  const pins = planPnpmPins(pnpmUpdate);
  if (pins.length === 0) return;

  const byFile = new Map();
  for (const pin of pins) {
    if (!byFile.has(pin.file)) byFile.set(pin.file, []);
    byFile.get(pin.file).push(pin);
  }

  for (const [file, pins] of byFile) {
    const lines = fs.readFileSync(file, 'utf8').split('\n');
    for (const pin of pins) {
      if (pin.kind === 'workflow') {
        lines[pin.index] = lines[pin.index].replace(
          /(version:\s*['"]?)\d+\.\d+\.\d+/,
          `$1${pnpmUpdate.latest}`
        );
      } else if (pin.kind === 'dockerfile') {
        lines[pin.index] = lines[pin.index].replace(
          /(pnpm@)\d+\.\d+\.\d+/,
          `$1${pnpmUpdate.latest}`
        );
      }
    }
    fs.writeFileSync(file, lines.join('\n'));
  }
}

function applyOverrideUpdates(updates) {
  if (updates.length === 0) return;

  const lines = fs.readFileSync(PNPM_WORKSPACE, 'utf8').split('\n');
  for (const update of updates) {
    lines[update.index] = renderOverrideLine(update);
  }
  fs.writeFileSync(PNPM_WORKSPACE, lines.join('\n'));
}

function applyActionUpdates(actionUpdates) {
  const byFile = new Map();
  for (const update of actionUpdates) {
    if (!byFile.has(update.file)) byFile.set(update.file, []);
    byFile.get(update.file).push(update);
  }

  for (const [file, updates] of byFile) {
    const lines = fs.readFileSync(file, 'utf8').split('\n');
    for (const update of updates) lines[update.index] = renderActionUse(update);
    fs.writeFileSync(file, lines.join('\n'));
  }
}

const pkg = JSON.parse(fs.readFileSync(PACKAGE_JSON, 'utf8'));
const [packageUpdates, overrideUpdates, pnpmInfo, actionUpdates, nodeInfo] =
  await Promise.all([
    checkPackages(pkg),
    checkOverrides(),
    checkPnpmPins(pkg),
    checkActions(),
    checkNode()
  ]);

report(packageUpdates, overrideUpdates, pnpmInfo, actionUpdates);
describeNode(pkg, nodeInfo);

const total =
  packageUpdates.length +
  overrideUpdates.length +
  actionUpdates.length +
  (pnpmInfo.update ? 1 : 0);

if (total === 0) {
  console.log('Everything is up to date.');
} else if (opts.write) {
  applyPackageUpdates(pkg, packageUpdates, pnpmInfo.update);
  applyPnpmPins(pnpmInfo.update);
  applyOverrideUpdates(overrideUpdates);
  applyActionUpdates(actionUpdates);
  console.log(
    `Updated ${total} entr${total === 1 ? 'y' : 'ies'}. Install with the pinned pnpm, then run lint, tests and the build.`
  );
} else {
  console.log(
    `${total} update${total === 1 ? '' : 's'} available. Re-run with --write to apply them.`
  );
}

if (errors.length > 0) {
  console.log('');
  console.log('Errors');
  for (const error of errors) console.log(`  ${error}`);
  process.exitCode = 1;
}

console.log('');
console.log(
  'Self-improvement: record a finding with --learn "<what this run taught>", then run --check.'
);
