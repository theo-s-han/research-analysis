import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { installModelResearch } from './llm-model-runtime.mjs';
import { validateAgentSnapshot, validateModelSnapshot, validateCursorSnapshot, calculateDeveloperMeasurements } from './llm-developer-data.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const content = path.join(root, 'content');
const availability = JSON.parse(await fs.readFile(path.join(content, 'llm-model-availability.json'), 'utf8'));
const verifiedAgents = validateAgentSnapshot(JSON.parse(await fs.readFile(path.join(content, 'llm-agent-benchmarks.json'), 'utf8')));
const verifiedModels = validateModelSnapshot(JSON.parse(await fs.readFile(path.join(content, 'llm-model-benchmarks.json'), 'utf8')));
const verifiedCursor = validateCursorSnapshot(JSON.parse(await fs.readFile(path.join(content, 'llm-cursor-benchmarks.json'), 'utf8')));
const measurements = JSON.parse(await fs.readFile(path.join(content, 'llm-developer-measurements.json'), 'utf8'));
const developerRows = measurements.records.map(calculateDeveloperMeasurements);
if (new Set(developerRows.map(row => row.id)).size !== developerRows.length) throw new Error('Duplicate developer measurements');
const decode = input => input.replace(/&#x([\da-f]+);/gi, (_, code) => String.fromCodePoint(parseInt(code, 16)))
  .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
  .replace(/&(?:amp|lt|gt|quot|apos|nbsp);/g, entity => ({ '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&apos;': "'", '&nbsp;': ' ' })[entity]);
const plain = input => decode(input.replace(/<br\s*\/?\s*>/gi, ' ').replace(/<[^>]+>/g, '')).trim();
const cells = row => [...row.matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)].map(match => plain(match[1]));
const attribute = (row, name) => decode(row.match(new RegExp(`\\b${name}="([^"]*)"`))?.[1] || '');
const bodyRows = table => [...(table.match(/<tbody\b[^>]*>([\s\S]*?)<\/tbody>/i)?.[1] || '').matchAll(/<tr\b[^>]*>[\s\S]*?<\/tr>/gi)].map(match => match[0]);
const tables = html => [...html.matchAll(/<table\b[^>]*>[\s\S]*?<\/table>/gi)].map(match => match[0]);
const providerOf = model => model.startsWith('GPT-') ? 'OpenAI' : model.startsWith('Claude ') ? 'Anthropic' : model.startsWith('Gemini ') ? 'Google' : model.startsWith('Grok ') ? 'xAI' : null;
const guideFile = 'Gemini_4_Argon_Model_Guide.html';
const guide = await fs.readFile(path.join(content, guideFile), 'utf8');
const comparison = tables(guide).find(table => /\bid="comparison-table"/.test(table));
if (!comparison) throw new Error('Full model comparison table not found');
const modelRows = bodyRows(comparison).map(row => {
  const values = cells(row);
  const model = attribute(row, 'data-model');
  const effort = attribute(row, 'data-effort');
  const provider = providerOf(model);
  if (values.length !== 13 || !model || !effort || !provider) throw new Error('Unexpected model comparison row');
  return {
    id: `model:${model}:${effort}`, model, effort, provider,
    values: [2, 3, 4, 5, 6, 7, 8, 9, 12].map(index => values[index]),
    context: values[10], note: values[11],
    observed: attribute(row, 'data-observed') || '2026-09-30',
    source: guideFile + '#comparison-table'
  };
});
const agentRows = [];
for (const file of ['Codex_6_model.html', 'Claude_Opus_5_5_Model_Guide.html']) {
  const html = await fs.readFile(path.join(content, file), 'utf8');
  const table = tables(html).find(item => /Coding Agent Index/.test(plain(item.match(/<thead\b[^>]*>([\s\S]*?)<\/thead>/i)?.[1] || '')));
  if (!table) throw new Error(`Native agent table missing: ${file}`);
  for (const row of bodyRows(table)) {
    const rowCells = cells(row);
    const label = rowCells[0].match(/^(.*?)\s+(Max|xHigh|High|Medium|Low)(Codex|Claude Code|Grok Build)$/);
    if (!label || rowCells.length < 8) throw new Error(`Unexpected native agent row: ${rowCells[0]}`);
    const model = /^(Opus|Fable|Sonnet|Haiku|Mythos)\b/.test(label[1]) ? 'Claude ' + label[1] : label[1];
    const effort = label[2], harness = label[3], id = `agent:TB4.0:${model}:${effort}:${harness}`;
    const record = { id, model, effort, harness, provider: providerOf(model), values: rowCells.slice(1, 8), context: modelRows.find(item => item.model === model)?.context || '—', source: file };
    const existing = agentRows.find(item => item.id === id);
    // Duplicate Astra is printed in minutes with different suffixes, not a new measurement.
    if (existing) {
      for (const index of [0, 1, 2, 3, 4, 6]) if (existing.values[index] !== record.values[index]) throw new Error(`Conflicting agent value: ${id}`);
      if (parseFloat(existing.values[5]) !== parseFloat(record.values[5])) throw new Error(`Conflicting agent time: ${id}`);
    } else agentRows.push(record);
  }
}
if (modelRows.length !== 46 || agentRows.length !== 9) throw new Error('Source coverage changed; inspect the input before publishing');
if (new Set(modelRows.map(row => row.id)).size !== modelRows.length) throw new Error('Duplicate model settings');
if (new Set(availability.models.map(model => model.id)).size !== availability.models.length) throw new Error('Duplicate availability entries');
const data = { availability, modelRows, agentRows, verifiedAgents, verifiedModels, verifiedCursor, developerRows, updatedAt: verifiedModels.updatedAt };
const serialized = JSON.stringify(data, null, 2).replace(/</g, '\\u003c');
const output = `// Generated by scripts/sync-llm-model-research.mjs; do not edit manually.\n(${installModelResearch.toString()})(${serialized});\n`;
const destination = path.join(content, 'llm-model-research.js');
if (process.argv.includes('--check')) {
  if (await fs.readFile(destination, 'utf8') !== output) throw new Error('Model research asset is stale; run npm run sync:models');
} else await fs.writeFile(destination, output);
console.log(`Synced ${availability.models.length} documented models, ${modelRows.length} historical + ${verifiedModels.records.length} verified model settings, ${agentRows.length} historical + ${verifiedAgents.records.length} verified agent settings, ${developerRows.length} developer measurements.`);
