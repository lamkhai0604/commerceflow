import type { Reporter, FullConfig, Suite, TestCase, TestResult, FullResult } from '@playwright/test/reporter';
import fs from 'fs';
import path from 'path';
const required = Array.from({ length: 15 }, (_, i) => `E2E-${String(i + 1).padStart(2, '0')}`);
export default class SafeReporter implements Reporter {
  private rows: Array<{ id: string; kind: string; status: string; failure?: string }> = [];
  private runnerError = false;
  onBegin(_config: FullConfig, suite: Suite) {
    if (process.argv.includes('--list')) for (const t of suite.allTests()) console.log(t.title);
  }
  onTestEnd(test: TestCase, result: TestResult) {
    const id = test.title.match(/E2E-\d+/)?.[0] || 'UNCLASSIFIED';
    const known = ['PROBLEM_CODE_STATUS', 'PROBLEM_CORRELATION', 'MULTIPLE_CORRELATION_HEADERS', 'VALIDATION_FIELDS',
      'EXPIRY_FIXTURE_FAILED', 'OWNED_SESSION_REQUIRED', 'ISOLATED_DATABASE_REQUIRED', 'OWNED_ACCOUNT_REQUIRED',
      'EXPIRY_DATABASE_UNREACHABLE', 'EXPIRED_RESTORE', 'QUIET_EXPIRED_STARTUP'];
    const diagnostic = known.find(code => result.error?.message?.includes(code))
      || (result.error?.message?.includes('TypeError') ? 'JAVASCRIPT_TYPE_ERROR' : 'ASSERTION_OR_TIMEOUT');
    this.rows.push({ id, kind: id === 'E2E-15' ? 'CONTROLLED_SYNTHETIC' : 'REAL_BACKEND', status: result.status === 'passed' ? 'PASS' : result.status === 'skipped' ? 'SKIPPED' : 'FAIL',
      failure: result.status === 'passed' ? undefined : diagnostic });
  }
  onStdOut() {} onStdErr() {} // Never emit worker call logs or raw failures.
  onError() { this.runnerError = true; }
  async onEnd(result: FullResult) {
    if (process.argv.includes('--list')) return;
    const pass = result.status === 'passed' && !this.runnerError && required.every(id => this.rows.some(r => r.id === id && r.status === 'PASS'))
      && this.rows.every(r => r.status === 'PASS');
    const summary = { offlinePublicAssets: true, status: pass ? 'PASS' : 'FAIL', tests: this.rows, requiredTestsSkipped: this.rows.filter(r => r.status === 'SKIPPED').length };
    const directory = process.env.E2E_EVIDENCE_DIR;
    if (directory) fs.writeFileSync(path.join(directory, 'summary.json'), JSON.stringify(summary, null, 2));
    console.log(JSON.stringify(summary));
    return { status: pass ? 'passed' as const : 'failed' as const };
  }
}
