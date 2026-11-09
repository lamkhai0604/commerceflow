const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
// Scripts under test, resolved from this file so the suite runs from any working directory.
const SCRIPTS = path.resolve(__dirname, '../scripts');
function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'cf-s1c-unit-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const scripts = path.join(root, 'e2e/scripts'); fs.mkdirSync(scripts, { recursive: true });
  for (const file of ['common.sh', 'cleanup.sh']) fs.copyFileSync(path.join(SCRIPTS, file), path.join(scripts, file));
  return { root, run: id => spawnSync('bash', [path.join(scripts, 'cleanup.sh'), id], { encoding: 'utf8' }) };
}
test('cleanup rejects traversal IDs without creating state', t => {
  const f = fixture(t); assert.notEqual(f.run('../outside').status, 0);
  assert.equal(fs.existsSync(path.join(f.root, 'e2e/.state')), false);
});
test('cleanup of absent owned run is a no-op', t => { const f = fixture(t); assert.equal(f.run('unit-absent').status, 0); });
test('cleanup rejects linked state root and preserves outside data', t => {
  const f = fixture(t), outside = path.join(f.root, 'outside'); fs.mkdirSync(outside);
  fs.writeFileSync(path.join(outside, 'sentinel'), 'preserve');
  fs.symlinkSync(outside, path.join(f.root, 'e2e/.state'));
  assert.notEqual(f.run('unit-linked').status, 0);
  assert.equal(fs.existsSync(path.join(outside, 'sentinel')), true);
});
test('cleanup rejects mismatched owner marker', t => {
  const f = fixture(t), state = path.join(f.root, 'e2e/.state/unit-owner'); fs.mkdirSync(state, { recursive: true });
  fs.writeFileSync(path.join(state, 'owner'), 'another-project');
  assert.notEqual(f.run('unit-owner').status, 0); assert.equal(fs.existsSync(path.join(state, 'owner')), true);
});
test('owned cleanup removes only fixtures and isolates host interpolation variables', t => {
  const f = fixture(t), id = 'unit-cleanup', state = path.join(f.root, 'e2e/.state', id);
  fs.mkdirSync(path.join(state, 'certs'), { recursive: true }); fs.mkdirSync(path.join(state, 'evidence'));
  fs.writeFileSync(path.join(state, 'owner'), `cf-s1c-${id}`); fs.writeFileSync(path.join(state, 'certs/ca.key'), 'fixture');
  const bin = path.join(f.root, 'bin'); fs.mkdirSync(bin);
  fs.writeFileSync(path.join(bin, 'docker'), [
    '#!/bin/sh',
    'for name in TEST_DB_PASSWORD REPO_DIR STATE_DIR RUN_ID BROWSER_IMAGE; do',
    '  if printenv "$name" >/dev/null; then exit 42; fi',
    'done',
    'case "$*" in *"image inspect"*) exit 1;; esac',
    'exit 0', '',
  ].join('\n'));
  fs.chmodSync(path.join(bin, 'docker'), 0o700);
  const result = spawnSync('bash', [path.join(f.root, 'e2e/scripts/cleanup.sh'), id], { encoding: 'utf8',
    env: { ...process.env, PATH: `${bin}:${process.env.PATH}`, TEST_DB_PASSWORD: 'synthetic-host-value', REPO_DIR: 'poison', STATE_DIR: 'poison', RUN_ID: 'poison', BROWSER_IMAGE: 'poison' } });
  assert.equal(result.status, 0); assert.equal(fs.existsSync(path.join(state, 'certs/ca.key')), false);
  assert.equal(JSON.parse(fs.readFileSync(path.join(state, 'evidence/cleanup.json'))).status, 'PASS');
});

// Fault injection runs only copied scripts and a fake Docker executable. No daemon.
function ownedFixture(t) {
  const f = fixture(t), id = 'unit-faults', state = path.join(f.root, 'e2e/.state', id);
  fs.mkdirSync(path.join(state, 'certs'), { recursive: true }); fs.mkdirSync(path.join(state, 'evidence'));
  fs.writeFileSync(path.join(state, 'owner'), `cf-s1c-${id}`);
  fs.writeFileSync(path.join(state, 'env'), 'TEST_DB_PASSWORD=synthetic-fixture');
  fs.writeFileSync(path.join(state, 'certs/ca.key'), 'synthetic-private-key');
  fs.writeFileSync(path.join(state, 'evidence/summary.json'), '{"status":"PASS"}');
  fs.writeFileSync(path.join(state, 'evidence/cleanup.json'), '{"status":"PASS"}');
  const bin = path.join(f.root, 'bin'); fs.mkdirSync(bin);
  fs.writeFileSync(path.join(bin, 'docker'), `#!/usr/bin/env node
const fs = require('node:fs');
const args = process.argv.slice(2).filter(a => !a.startsWith('--host='));
const op = args.join(' ');
if (process.env.FAIL_DOCKER_MATCH && op.includes(process.env.FAIL_DOCKER_MATCH)) process.exit(73);
if (op.startsWith('ps ') && process.env.REMAINING_CONTAINER) console.log('owned-container');
if (op.startsWith('network ls') && process.env.REMAINING_NETWORK) console.log('owned-network');
if (op.startsWith('image ls') && fs.existsSync(process.env.IMAGE_MARKER)) console.log('owned-image');
if (op.startsWith('image inspect')) console.log(process.env.WRONG_IMAGE_OWNER ? 'other-owner' : 'unit-faults');
if (op.startsWith('image rm')) fs.unlinkSync(process.env.IMAGE_MARKER);
`);
  fs.chmodSync(path.join(bin, 'docker'), 0o700);
  const marker = path.join(f.root, 'image-present');
  const run = (overrides = {}) => spawnSync('bash', [path.join(f.root, 'e2e/scripts/cleanup.sh'), id], {
    encoding: 'utf8', env: { ...process.env, PATH: `${bin}:${process.env.PATH}`, IMAGE_MARKER: marker, ...overrides },
  });
  return { ...f, state, marker, run };
}
for (const [operation, stage] of [
  ['info', 'DOCKER_ACCESS'], ['compose', 'COMPOSE_DOWN'], ['ps -aq', 'CONTAINER_INVENTORY'],
  ['network ls', 'NETWORK_INVENTORY'], ['image ls', 'IMAGE_INVENTORY'],
  ['image inspect', 'IMAGE_OWNERSHIP'], ['image rm', 'IMAGE_REMOVAL'],
]) {
  test(`cleanup fails closed at ${stage}, retains secrets and permits retry`, t => {
    const f = ownedFixture(t); fs.writeFileSync(f.marker, 'owned');
    const result = f.run({ FAIL_DOCKER_MATCH: operation });
    assert.notEqual(result.status, 0);
    const evidence = JSON.parse(fs.readFileSync(path.join(f.state, 'evidence/cleanup.json')));
    assert.deepEqual({ status: evidence.status, stage: evidence.stage, secretsRemoved: evidence.secretsRemoved },
      { status: 'FAIL', stage, secretsRemoved: false });
    assert.equal(fs.existsSync(path.join(f.state, 'env')), true);
    assert.equal(fs.existsSync(path.join(f.state, 'certs/ca.key')), true);
    assert.equal(fs.existsSync(path.join(f.state, 'evidence/summary.json')), true);
    assert.doesNotMatch(result.stdout + result.stderr, /synthetic-fixture|synthetic-private-key/);
    assert.equal(f.run().status, 0);
    assert.equal(fs.existsSync(path.join(f.state, 'env')), false);
    assert.equal(fs.existsSync(path.join(f.state, 'certs/ca.key')), false);
    assert.equal(f.run().status, 0); // Idempotent retry after successful removal.
    assert.equal(JSON.parse(fs.readFileSync(path.join(f.state, 'evidence/cleanup.json'))).status, 'PASS');
  });
}
for (const [variable, stage] of [['REMAINING_CONTAINER', 'CONTAINER_INVENTORY'], ['REMAINING_NETWORK', 'NETWORK_INVENTORY']]) {
  test(`remaining owned resource at ${stage} blocks secret removal`, t => {
    const f = ownedFixture(t);
    assert.notEqual(f.run({ [variable]: '1' }).status, 0);
    assert.equal(fs.existsSync(path.join(f.state, 'env')), true);
    assert.equal(JSON.parse(fs.readFileSync(path.join(f.state, 'evidence/cleanup.json'))).stage, stage);
    assert.equal(f.run().status, 0);
  });
}
test('foreign image ownership prevents removal and reports failure', t => {
  const f = ownedFixture(t); fs.writeFileSync(f.marker, 'other');
  assert.notEqual(f.run({ WRONG_IMAGE_OWNER: '1' }).status, 0);
  assert.equal(fs.existsSync(f.marker), true);
  assert.equal(fs.existsSync(path.join(f.state, 'env')), true);
  assert.equal(JSON.parse(fs.readFileSync(path.join(f.state, 'evidence/cleanup.json'))).stage, 'IMAGE_OWNERSHIP');
});
test('linked evidence destination is rejected without overwriting outside files', t => {
  const f = ownedFixture(t), outside = path.join(f.root, 'outside.json');
  fs.writeFileSync(outside, 'preserve'); fs.unlinkSync(path.join(f.state, 'evidence/cleanup.json'));
  fs.symlinkSync(outside, path.join(f.state, 'evidence/cleanup.json'));
  assert.notEqual(f.run().status, 0); assert.equal(fs.readFileSync(outside, 'utf8'), 'preserve');
  assert.equal(fs.existsSync(path.join(f.state, 'env')), true);
});
test('runner preserves browser failure and fails a passing browser when cleanup fails', t => {
  const f = fixture(t), scripts = path.join(f.root, 'e2e/scripts'), bin = path.join(f.root, 'bin');
  fs.copyFileSync(path.join(SCRIPTS, 'run.sh'), path.join(scripts, 'run.sh'));
  fs.writeFileSync(path.join(scripts, 'start.sh'), '#!/bin/bash\nexit 0\n');
  fs.writeFileSync(path.join(scripts, 'cleanup.sh'), '#!/bin/bash\nexit "$CLEANUP_EXIT"\n');
  fs.mkdirSync(bin); fs.writeFileSync(path.join(bin, 'docker'), '#!/bin/bash\nexit "$BROWSER_EXIT"\n');
  fs.chmodSync(path.join(bin, 'docker'), 0o700);
  const run = (browser, cleanup) => spawnSync('bash', [path.join(scripts, 'run.sh'), 'unit-runner'], {
    encoding: 'utf8', env: { ...process.env, PATH: `${bin}:${process.env.PATH}`, BROWSER_EXIT: String(browser), CLEANUP_EXIT: String(cleanup) },
  });
  assert.equal(run(0, 0).status, 0);
  assert.equal(run(7, 0).status, 7);
  assert.notEqual(run(0, 9).status, 0);
  assert.notEqual(run(7, 9).status, 0);
});
test('secret deletion failure is reported and can be retried without losing evidence', t => {
  const f = ownedFixture(t), fakeRm = path.join(f.root, 'bin/rm');
  fs.writeFileSync(fakeRm, '#!/bin/sh\nexit 73\n'); fs.chmodSync(fakeRm, 0o700);
  assert.notEqual(f.run().status, 0);
  assert.equal(JSON.parse(fs.readFileSync(path.join(f.state, 'evidence/cleanup.json'))).stage, 'SECRET_REMOVAL');
  assert.equal(fs.existsSync(path.join(f.state, 'env')), true);
  assert.equal(fs.existsSync(path.join(f.state, 'evidence/summary.json')), true);
  fs.unlinkSync(fakeRm);
  assert.equal(f.run().status, 0);
});

// Startup fixtures have no host PATH fallback and stop at a fake port preflight.
function startupFixture(t) {
  const f = fixture(t), scripts = path.join(f.root, 'e2e/scripts'), bin = path.join(f.root, 'bin');
  fs.copyFileSync(path.join(SCRIPTS, 'start.sh'), path.join(scripts, 'start.sh'));
  for (const file of ['frontend/build/index.html', 'backend/target/backend-0.0.1-SNAPSHOT.jar']) {
    fs.mkdirSync(path.dirname(path.join(f.root, file)), { recursive: true });
    fs.writeFileSync(path.join(f.root, file), 'fixture');
  }
  fs.mkdirSync(bin);
  // Only these utilities are exposed; Docker and Python are always fixture code.
  for (const [name, source] of [['env', '/usr/bin/env'], ['dirname', '/usr/bin/dirname']]) fs.symlinkSync(source, path.join(bin, name));
  fs.writeFileSync(path.join(bin, 'docker'), `#!${process.execPath}
const fs = require('node:fs');
const args = process.argv.slice(2);
if (args.shift() !== '--host=unix:///var/run/docker.sock') process.exit(97);
const op = args.join(' ');
const allowed = ['info', 'ps -aq --filter label=com.docker.compose.project=cf-s1c-unit-startup', 'network ls -q --filter label=com.docker.compose.project=cf-s1c-unit-startup'];
const stage = ['info', 'containers', 'networks'][allowed.indexOf(op)];
fs.appendFileSync(process.env.CALL_LOG, (stage || 'unexpected') + '\\n');
if (!stage) process.exit(97);
if (stage === process.env.INVENTORY_STAGE) {
  process.stdout.write(process.env.INVENTORY_OUTPUT);
  process.stderr.write(process.env.INVENTORY_ERROR);
  process.exit(Number(process.env.INVENTORY_EXIT));
}
`);
  fs.writeFileSync(path.join(bin, 'python3'), `#!${process.execPath}
require('node:fs').appendFileSync(process.env.CALL_LOG, 'port-preflight\\n');
process.exit(91);
`);
  for (const name of ['docker', 'python3']) fs.chmodSync(path.join(bin, name), 0o700);
  const log = path.join(f.root, 'calls');
  const run = (stage, status, output = '', error = '') => {
    fs.writeFileSync(log, '');
    const result = spawnSync('/bin/bash', [path.join(scripts, 'start.sh'), 'unit-startup'], {
      encoding: 'utf8', timeout: 5000,
      env: { PATH: bin, CALL_LOG: log, INVENTORY_STAGE: stage, INVENTORY_EXIT: String(status), INVENTORY_OUTPUT: output, INVENTORY_ERROR: error },
    });
    assert.equal(result.error, undefined);
    assert.equal(result.signal, null);
    assert.equal(fs.existsSync(path.join(f.root, 'e2e/.state')), false);
    return { ...result, calls: fs.readFileSync(log, 'utf8').trim().split('\n') };
  };
  return { run };
}
for (const [id, stage, status, output, error] of [
  ['B02-T01', 'containers', 73, '', ''],
  ['B02-T02', 'containers', 73, 'synthetic-resource', ''],
  ['B02-T03', 'containers', 73, '', 'synthetic-sensitive-diagnostic'],
  ['B02-T04', 'containers', 0, 'synthetic-resource', ''],
  ['B02-T05', 'networks', 73, '', ''],
  ['B02-T06', 'networks', 73, 'synthetic-resource', ''],
  ['B02-T07', 'networks', 73, '', 'synthetic-sensitive-diagnostic'],
  ['B02-T08', 'networks', 0, 'synthetic-resource', ''],
]) {
  test(`${id}: startup ${stage} ${status ? 'inventory failure' : 'collision'} fails closed`, t => {
    const f = startupFixture(t), result = f.run(stage, status, output, error);
    assert.equal(result.status, 1);
    assert.deepEqual(result.calls, stage === 'containers' ? ['info', 'containers'] : ['info', 'containers', 'networks']);
    const diagnostic = result.stdout + result.stderr;
    assert.match(diagnostic, status ? /inventory failed/ : stage === 'containers' ? /Project collision/ : /Network collision/);
    if (status) assert.doesNotMatch(diagnostic, /collision/);
    assert.doesNotMatch(diagnostic, /synthetic-resource|synthetic-sensitive-diagnostic/);
    if (id === 'B02-T08') {
      const empty = f.run('networks', 0);
      assert.equal(empty.status, 91);
      assert.deepEqual(empty.calls, ['info', 'containers', 'networks', 'port-preflight']);
      assert.equal(empty.stdout + empty.stderr, '');
    }
  });
}
