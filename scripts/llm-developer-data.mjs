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
    if (!row.sourceId || ids.has(row.sourceId) || !row.model || !row.effort || !row.provider
        || !row.harness || !row.harnessVersion || !Array.isArray(row.fallbackModels)
        || !Number.isInteger(row.retainedAttempts) || row.retainedAttempts <= 0) throw new Error('Invalid agent provenance');
    ids.add(row.sourceId);
    for (const key of ['index', 'deepSWE', 'terminalBench', 'sweAtlas']) {
      if (!Number.isFinite(row[key]) || row[key] < 0 || row[key] > 100) throw new Error('Invalid agent score: ' + key);
    }
    for (const key of ['costUsd', 'timeSeconds', 'totalTokens', 'turns']) {
      if (!Number.isFinite(row[key]) || row[key] < 0) throw new Error('Invalid agent measurement: ' + key);
    }
    for (const key of ['deep-swe-v1.1', 'terminal-bench-v4', 'swe-atlas-qna']) {
      const version = row.harnessVersions?.[key];
      if (!version?.min?.version || !version?.max?.version) throw new Error('Missing per-benchmark harness version');
    }
    const index = (row.deepSWE + row.terminalBench + row.sweAtlas) / 3;
    if (Math.abs(row.index - index) > 1e-8) throw new Error('Coding Agent Index component mismatch');
  }
  return snapshot;
}

export function validateModelSnapshot(snapshot) {
  if (snapshot.source !== 'https://artificialanalysis.ai/models'
      || snapshot.methodology !== 'https://artificialanalysis.ai/methodology/intelligence-benchmarking'
      || snapshot.suite !== 'AA Intelligence Index v4.3.2'
      || !/^\d{4}-\d{2}-\d{2}$/.test(snapshot.verifiedAt)
      || !/^\d{4}-\d{2}-\d{2}$/.test(snapshot.updatedAt)
      || snapshot.benchmarkVersions?.briefcase !== '1.1'
      || snapshot.benchmarkVersions?.terminal !== '4.0'
      || snapshot.benchmarkVersions?.lcr !== '1.1') throw new Error('Unverified model snapshot');
  const ids = new Set(), slugs = new Set();
  for (const row of snapshot.records) {
    if (!row.sourceId || ids.has(row.sourceId) || !row.slug || slugs.has(row.slug)
        || row.source !== 'https://artificialanalysis.ai/models/' + row.slug
        || !row.model || !row.name || !row.effort || !row.provider
        || typeof row.estimated !== 'boolean' || typeof row.isOpenWeights !== 'boolean'
        || !Array.isArray(row.evaluationSlugs)) throw new Error('Invalid model provenance');
    ids.add(row.sourceId); slugs.add(row.slug);
    for (const key of ['index', 'briefcase', 'cost', 'contextTokens', 'parameters', 'activeParameters']) {
      if (row[key] != null && (!Number.isFinite(row[key]) || row[key] < 0)) throw new Error('Invalid model value: ' + key);
    }
    if (row.index != null && row.index > 100) throw new Error('Invalid Intelligence Index');
    for (const key of ['automation', 'terminal', 'scicode', 'lcr']) {
      if (row[key] != null && (!Number.isFinite(row[key]) || row[key] < 0 || row[key] > 1)) throw new Error('Invalid model proportion: ' + key);
    }
    if (row.release != null && !/^\d{4}-\d{2}-\d{2}$/.test(row.release)) throw new Error('Invalid model release date');
  }
  return snapshot;
}

export function validateCursorSnapshot(snapshot) {
  if (snapshot.source !== 'https://prod.cursor.com/evals'
      || snapshot.suite !== 'CursorBench 4.0'
      || !/^\d{4}-\d{2}-\d{2}$/.test(snapshot.verifiedAt)) throw new Error('Unverified Cursor snapshot');
  const labels = new Set();
  for (const row of snapshot.records) {
    if (!row.label || labels.has(row.label) || !row.model || !row.effort || !row.provider) throw new Error('Invalid Cursor provenance');
    labels.add(row.label);
    if (!Number.isFinite(row.score) || row.score < 0 || row.score > 100
        || !Number.isFinite(row.costUsd) || row.costUsd < 0
        || !Number.isInteger(row.tokens) || row.tokens < 0
        || !Number.isInteger(row.steps) || row.steps < 0) throw new Error('Invalid Cursor measurement');
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
