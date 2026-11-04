import { randomBytes, randomUUID } from 'crypto';
export function testUser() {
  const run = process.env.E2E_RUN_ID;
  if (!run || !/^[a-z0-9-]+$/.test(run)) throw new Error('OWNED_RUN_REQUIRED');
  return { fullName: 'Integration Customer', email: `cf-${run.slice(0, 20)}-${randomUUID().slice(0, 8)}@e2e.invalid`,
    password: randomBytes(18).toString('hex') };
}
