// Measurements are independent of AA model/agent scores and consumer-plan capacity.
export function validateAgentSnapshot(snapshot) {
  if (snapshot.source !== 'https://artificialanalysis.ai/agents/coding-agents'
      || snapshot.suite !== 'Coding Agent Index v1.5'
      || !/^\d{4}-\d{2}-\d{2}$/.test(snapshot.verifiedAt)
      || snapshot.benchmarkVersions?.deepSWE !== '1.1'
      || snapshot.benchmarkVersions?.terminalBench !== '4.0'
      || snapshot.benchmarkVersions?.sweAtlas !== 'QnA') throw new Error('Unverified coding-agent snapshot');
  const ids = new Set();
  for (const row of snapshot.records) {
    if (!row.sourceId || ids.has(row.sourceId) || !row.model || !row.effort || !['OpenAI', 'Anthropic', 'Google', 'xAI'].includes(row.provider)
        || !row.harness || !row.harnessVersion || !Array.isArray(row.fallbackModels)
        || !Number.isInteger(row.retainedAttempts) || row.retainedAttempts <= 0) throw new Error('Invalid agent provenance');
    ids.add(row.sourceId);
    for (const key of ['index', 'deepSWE', 'terminalBench', 'sweAtlas']) {
      if (!Number.isFinite(row[key]) || row[key] < 0 || row[key] > 100) throw new Error('Invalid agent score: ' + key);
    }
    for (const key of ['costUsd', 'timeSeconds', 'totalTokens']) {
      if (!Number.isFinite(row[key]) || row[key] < 0) throw new Error('Invalid agent measurement: ' + key);
    }
    const index = (row.deepSWE + row.terminalBench + row.sweAtlas) / 3;
    if (Math.abs(row.index - index) > 1e-8) throw new Error('Coding Agent Index component mismatch');
  }
  return snapshot;
}

export function calculateDeveloperMeasurements(record) {
  for (const key of ['id', 'model', 'effort', 'harness', 'workload', 'testSuite', 'measuredAt', 'source']) {
    if (typeof record[key] !== 'string' || !record[key].trim()) throw new Error('Missing measurement provenance: ' + key);
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(record.measuredAt)) throw new Error('Invalid measurement date');
  for (const key of ['totalTasks', 'completedTasks', 'unassistedCompletedTasks', 'regressionFreeCompletedTasks']) {
    if (!Number.isInteger(record[key]) || record[key] < 0) throw new Error('Invalid measured task count: ' + key);
  }
  if (record.completedTasks > record.totalTasks
      || record.unassistedCompletedTasks > record.completedTasks
      || record.regressionFreeCompletedTasks > record.completedTasks
      || !Number.isFinite(record.totalCostUsd) || record.totalCostUsd < 0) throw new Error('Inconsistent measurement totals');
  return {
    ...record,
    unassistedRate: record.totalTasks ? record.unassistedCompletedTasks / record.totalTasks * 100 : null,
    regressionFreeRate: record.totalTasks ? record.regressionFreeCompletedTasks / record.totalTasks * 100 : null,
    costPerSuccess: record.completedTasks ? record.totalCostUsd / record.completedTasks : null
  };
}
