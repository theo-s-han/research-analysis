import fs from 'node:fs/promises';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { root, hash, filesIn, readJSON, dateKO, textOnly } from './lib.mjs';
import { board, reader, notFound } from './templates.mjs';

const contentRoot = path.join(root, 'content');
const output = path.join(root, 'dist');
const config = await readJSON(path.join(root, 'site.config.json'));
const catalog = await readJSON(path.join(contentRoot, 'catalog.json'), {});
const sourceInfo = await readJSON(path.join(contentRoot, '.source-info.json'), {});
const files = await filesIn(contentRoot);
const documents = [];
const usedSlugs = new Set();
const warnings = [];
const attribute = (tag, name) => tag.match(new RegExp(`\\b${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)')`, 'i'))?.slice(1).find((value) => value !== undefined);
const metadata = (html, key) => {
  const meta = [...html.matchAll(/<meta\b[^>]*>/gi)].find(([tag]) => attribute(tag, 'name') === key);
  return meta ? textOnly(attribute(meta[0], 'content') || '') : '';
};
function updatedDate(file, digest, stat) {
  if (sourceInfo[file]?.sha256 === digest) return dateKO(sourceInfo[file].updatedAt);
  try {
    const value = execFileSync('git', ['log', '-1', '--format=%cI', '--', `content/${file}`], { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
    if (value) return dateKO(value);
  } catch { /* A standalone folder does not have Git history. */ }
  return dateKO(stat.mtime);
}
for (const file of files.filter((file) => /\.html?$/i.test(file))) {
  const bytes = await fs.readFile(path.join(contentRoot, file));
  const html = bytes.toString('utf8');
  if (metadata(html, 'research:listed') === 'false') continue;
  const custom = catalog[file] || {};
  const title = custom.title || textOnly(html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1] || '') || textOnly(html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)?.[1] || '') || path.basename(file, path.extname(file));
  const nameBase = path.basename(file, path.extname(file)).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 50);
  const slug = custom.slug || metadata(html, 'research:slug') || `${nameBase || 'document'}-${hash(file.normalize('NFC')).slice(0, 8)}`;
  if (!/^[a-z0-9][a-z0-9-]{0,95}$/.test(slug)) throw new Error(`영문 소문자·숫자·하이픈으로 된 slug가 필요합니다: ${file}`);
  if (usedSlugs.has(slug)) throw new Error(`개별 자료 주소 중복: ${slug}`);
  usedSlugs.add(slug);
  const firstParagraph = textOnly(html.match(/<body\b[^>]*>([\s\S]*)/i)?.[1]?.match(/<p\b[^>]*>([\s\S]*?)<\/p>/i)?.[1] || '');
  const description = custom.description || metadata(html, 'research:summary') || metadata(html, 'description') || firstParagraph.slice(0, 150) || `${title} 자료를 확인하세요.`;
  const stat = await fs.stat(path.join(contentRoot, file));
  const digest = hash(bytes);
  const folder = file.includes('/') ? file.split('/')[0] : '';
  const category = custom.category || metadata(html, 'research:category') || folder || '일반 자료';
  const tags = custom.tags || metadata(html, 'research:tags').split(',').map((value) => value.trim()).filter(Boolean);
  if (!Array.isArray(tags)) throw new Error(`tags는 문자열 배열이어야 합니다: ${file}`);
  if (/(?:file:\/\/|\\\\PO_FILE|(?:C|D|E):\\|github_pat_|ghp_[a-zA-Z0-9]{30}|sk-proj-[a-zA-Z0-9]{20})/i.test(html)) throw new Error(`로컬 경로 또는 인증정보 의심 문자열을 확인하세요: ${file}`);
  for (const [, reference] of html.matchAll(/(?:src|href)\s*=\s*["']([^"']+)["']/gi)) {
    if (/^(?:[a-z][a-z\d+.-]*:|\/\/|#|\?)/i.test(reference)) continue;
    if (reference.startsWith('/')) { warnings.push(`${file}: 사이트 루트 기준 경로 확인 필요 (${reference})`); continue; }
    const clean = decodeURIComponent(reference.split(/[?#]/)[0]);
    if (!clean) continue;
    const local = path.resolve(contentRoot, path.dirname(file), clean);
    const relative = path.relative(contentRoot, local);
    if (relative.startsWith('..') || path.isAbsolute(relative)) throw new Error(`자료 폴더 밖의 연결 파일: ${file} → ${reference}`);
    const valid = await fs.stat(local).catch(() => null);
    if (!valid || (!valid.isFile() && !await fs.stat(path.join(local, 'index.html')).catch(() => null))) throw new Error(`연결 파일이 없습니다: ${file} → ${reference}`);
  }
  documents.push({ id: hash(file.normalize('NFC')).slice(0, 12), slug, file, title, description, category, tags: tags.map(String), author: custom.author || config.author, updatedAt: updatedDate(file, digest, stat), referenceDate: custom.referenceDate || null, sha256: digest, bytes: bytes.length, searchText: textOnly(html).slice(0, 180000) });
}
documents.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt) || a.title.localeCompare(b.title, 'ko'));
documents.forEach((doc, index) => { doc.isLatest = index === 0; });
const categoryNames = [...new Set(documents.map((doc) => doc.category))];
const preferred = ['모델 리서치', '벤치마크', '업무 활용'];
categoryNames.sort((a, b) => (preferred.includes(a) ? preferred.indexOf(a) : 99) - (preferred.includes(b) ? preferred.indexOf(b) : 99) || a.localeCompare(b, 'ko'));
const categories = categoryNames.map((name) => ({ name, count: documents.filter((doc) => doc.category === name).length }));

// Only replace the fixed, generated dist/ folder after all source validation passes.
if (path.dirname(output) !== root || path.basename(output) !== 'dist') throw new Error('잘못된 출력 경로입니다.');
const oldOutput = await fs.lstat(output).catch(() => null);
if (oldOutput?.isSymbolicLink()) throw new Error('출력 폴더가 심볼릭 링크입니다.');
await fs.rm(output, { recursive: true, force: true });
await fs.mkdir(output, { recursive: true });
await fs.cp(path.join(root, 'web'), path.join(output, 'assets'), { recursive: true });
for (const file of files.filter((file) => file !== 'catalog.json')) {
  const destination = path.join(output, 'materials', file);
  await fs.mkdir(path.dirname(destination), { recursive: true });
  await fs.copyFile(path.join(contentRoot, file), destination);
}
for (const doc of documents) {
  const destination = path.join(output, 'docs', doc.slug);
  await fs.mkdir(destination, { recursive: true });
  await fs.writeFile(path.join(destination, 'index.html'), reader(config, doc));
}
await fs.writeFile(path.join(output, 'index.html'), board(config, documents, categories));
await fs.writeFile(path.join(output, '404.html'), notFound(config));
await fs.writeFile(path.join(output, '.nojekyll'), '');
await fs.writeFile(path.join(output, 'catalog.json'), JSON.stringify({ documents: documents.map(({ searchText, ...doc }) => doc), categories }, null, 2) + '\n');
if (warnings.length) console.warn(warnings.join('\n'));
console.log(`게시판 생성 완료: ${documents.length}개 자료, ${categories.length}개 분류. 출력: dist/`);
