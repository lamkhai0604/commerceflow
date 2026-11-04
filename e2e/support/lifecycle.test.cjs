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
