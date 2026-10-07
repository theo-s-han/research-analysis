import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs/promises';
import { calculateDeveloperMeasurements, validateAgentSnapshot } from './llm-developer-data.mjs';

const measured = {
  id: 'test:one', model: 'GPT-6.1 Sol', effort: 'High', harness: 'Codex test',
  workload: 'same repository/tasks', testSuite: 'feature + existing tests',
  measuredAt: '2026-10-07', source: 'https://example.com/measurement',
  totalTasks: 10, completedTasks: 8, unassistedCompletedTasks: 6,
  regressionFreeCompletedTasks: 7, totalCostUsd: 16
};
test('rates use all assigned tasks; cost includes failures and retries', () => {
  const result = calculateDeveloperMeasurements(measured);
  assert.equal(result.unassistedRate, 60);
  assert.equal(result.regressionFreeRate, 70);
  assert.equal(result.costPerSuccess, 2);
});
test('no assigned/completed tasks is unknown, not a fabricated zero', () => {
  const result = calculateDeveloperMeasurements({...measured, totalTasks: 0, completedTasks: 0, unassistedCompletedTasks: 0, regressionFreeCompletedTasks: 0});
  assert.equal(result.unassistedRate, null);
  assert.equal(result.regressionFreeRate, null);
  assert.equal(result.costPerSuccess, null);
  assert.equal(calculateDeveloperMeasurements({...measured, totalCostUsd: 0}).costPerSuccess, 0);
});
test('reject missing provenance and inconsistent counts/costs', () => {
  for (const patch of [{source: ''}, {workload: ''}, {testSuite: ''}, {totalTasks: 1}, {completedTasks: 11}, {unassistedCompletedTasks: 9}, {regressionFreeCompletedTasks: 9}, {totalCostUsd: -1}, {totalTasks: 1.5}]) {
    assert.throws(() => calculateDeveloperMeasurements({...measured, ...patch}));
  }
});
test('checked-in agent values retain their suite, units, source IDs and component average', async () => {
  const input = JSON.parse(await fs.readFile(new URL('../content/llm-agent-benchmarks.json', import.meta.url), 'utf8'));
  validateAgentSnapshot(input);
  assert.equal(input.records.filter(row => row.model === 'GPT-6.1 Sol').length, 5);
  assert.equal(input.records.filter(row => row.model === 'Claude Sonnet 5.5').length, 5);
  assert.throws(() => validateAgentSnapshot({...input, suite: 'Coding Agent Index v1.3'}));
  assert.throws(() => validateAgentSnapshot({...input, records: [input.records[0], input.records[0]]}));
  assert.throws(() => validateAgentSnapshot({...input, records: [{...input.records[0], costUsd: null}]}));
  assert.throws(() => validateAgentSnapshot({...input, records: [{...input.records[0], index: 99}]}));
});
