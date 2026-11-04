const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'cf-s1c-unit-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const scripts = path.join(root, 'e2e/scripts'); fs.mkdirSync(scripts, { recursive: true });
  for (const file of ['common.sh', 'cleanup.sh']) fs.copyFileSync(path.resolve('e2e/scripts', file), path.join(scripts, file));
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
  fs.copyFileSync(path.resolve('e2e/scripts/run.sh'), path.join(scripts, 'run.sh'));
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
