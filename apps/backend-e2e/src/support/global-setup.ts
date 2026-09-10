import { killPort, waitForPortOpen } from '@nx/node/utils';

const host = process.env['HOST'] ?? 'localhost';
const port = process.env['PORT'] ? Number(process.env['PORT']) : 3000;

export async function setup(): Promise<void> {
  // Start services the app needs to run (e.g. database, docker compose).
  console.log('\nSetting up...\n');
  await waitForPortOpen(port, { host });
}

export async function teardown(): Promise<void> {
  await killPort(port);
  console.log('\nTearing down...\n');
}
