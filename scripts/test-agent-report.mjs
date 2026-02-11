#!/usr/bin/env node
/**
 * Runs agent intent tests with JSON reporter and prints a review-friendly summary:
 * total / passed / failed and a list of failed case names and errors.
 * Usage: node scripts/test-agent-report.mjs
 * Exit code: 0 if all passed, 1 if any failed.
 */

import { spawnSync } from 'child_process';
import { readFileSync, unlinkSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const outputPath = join(root, 'test-results-agent.json');

const result = spawnSync(
  'npx',
  ['vitest', 'run', 'convex/agent.search.test.ts', '--reporter=json', `--outputFile=${outputPath}`],
  { cwd: root, encoding: 'utf-8', shell: true }
);

let data;
try {
  data = JSON.parse(readFileSync(outputPath, 'utf-8'));
} catch (e) {
  console.error('Failed to read test results. Did the test run complete?', e.message);
  process.exit(2);
}

try {
  unlinkSync(outputPath);
} catch (_) {}

const total = data.numTotalTests ?? 0;
const passed = data.numPassedTests ?? 0;
const failed = data.numFailedTests ?? 0;

console.log('--- Agent intent test report ---');
console.log(`Total: ${total}  Passed: ${passed}  Failed: ${failed}`);
console.log('');

if (failed > 0 && Array.isArray(data.testResults)) {
  console.log('Failed cases:');
  for (const file of data.testResults) {
    const assertions = file.assertionResults ?? [];
    for (const a of assertions) {
      if (a.status === 'failed') {
        console.log(`  - ${a.fullName ?? a.title}`);
        for (const msg of a.failureMessages ?? []) {
          console.log(`    ${msg.split('\n').join('\n    ')}`);
        }
      }
    }
  }
  console.log('');
  process.exit(1);
}

process.exit(result.status !== 0 ? result.status : 0);
