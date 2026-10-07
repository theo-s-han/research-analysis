import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs/promises';
import { calculateDeveloperMeasurements, validateAgentSnapshot, validateModelSnapshot, validateCursorSnapshot } from './llm-developer-data.mjs';

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
  assert.equal(input.records.length, 31);
  assert.throws(() => validateAgentSnapshot({...input, records: [{...input.records[0], turns: null}]}));
  assert.throws(() => validateAgentSnapshot({...input, records: [{...input.records[0], harnessVersions: {}}]}));
});
test('model snapshot distinguishes measured values, missing values and estimated Index', async () => {
  const input = JSON.parse(await fs.readFile(new URL('../content/llm-model-benchmarks.json', import.meta.url), 'utf8'));
  validateModelSnapshot(input);
  assert.equal(input.records.length, 283);
  assert.equal(input.records.filter(row => row.model === 'GPT-6.1 Sol').length, 5);
  assert.equal(input.records.filter(row => row.model === 'Claude Sonnet 5.5').length, 5);
  assert(input.records.some(row => row.estimated && row.lcr != null));
  assert(input.records.some(row => row.cost == null));
  const row = input.records[0];
  assert.throws(() => validateModelSnapshot({...input, suite: 'AA Intelligence Index v3'}));
  assert.throws(() => validateModelSnapshot({...input, records: [row, row]}));
  for (const patch of [{source:'https://example.com'}, {estimated:null}, {terminal:101}, {lcr:-1}, {briefcase:NaN}, {cost:-1}, {index:101}, {release:'2026-99'}]) {
    assert.throws(() => validateModelSnapshot({...input, records:[{...row,...patch}]}));
  }
  validateModelSnapshot({...input, records:[{...row, cost:0, terminal:0, index:null, lcr:null}]});
});
test('Cursor values keep their own evaluation/version and source label', async () => {
  const input = JSON.parse(await fs.readFile(new URL('../content/llm-cursor-benchmarks.json', import.meta.url), 'utf8'));
  validateCursorSnapshot(input);
  assert.equal(input.records.length, 63);
  assert.equal(input.records.find(row => row.model === 'Claude Sonnet 5.5' && row.effort === 'Max').score, 55.5);
  assert(!input.records.some(row => row.model === 'GPT-6.1 Sol'));
  assert.throws(() => validateCursorSnapshot({...input, suite:'CursorBench 3.2'}));
  assert.throws(() => validateCursorSnapshot({...input, records:[input.records[0],input.records[0]]}));
  for (const patch of [{score:101}, {costUsd:null}, {tokens:1.5}, {steps:-1}]) {
    assert.throws(() => validateCursorSnapshot({...input, records:[{...input.records[0],...patch}]}));
  }
});
