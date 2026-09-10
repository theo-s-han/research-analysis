import fs from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import { root, readJSON, hash, filesIn } from './lib.mjs';
import { board } from './templates.mjs';

const output = path.join(root, 'dist');
const catalog = await readJSON(path.join(output, 'catalog.json'));
const index = await fs.readFile(path.join(output, 'index.html'), 'utf8');
const data = JSON.parse(index.match(/<script id="research-data" type="application\/json">([\s\S]*?)<\/script>/)[1]);
// Check site chrome separately so user-provided document titles remain unrestricted.
const boardShell = board(await readJSON(path.join(root, 'site.config.json')), [], []).replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '');
const boardCopy = boardShell.replace(/<[^>]+>/g, ' ');
assert.doesNotMatch(boardCopy, /POLARIS\s*OFFICE|폴라리스오피스|Team knowledge|함께 쌓아가는 리서치|RESEARCH LIBRARY|TEAM RESEARCH|WORKSPACE|CONTRIBUTOR GUIDE/i, '사용자가 제공하지 않은 회사·팀·소개 문구가 게시판에 남아 있습니다.');
assert.doesNotMatch(boardShell, /class="(?:brand-mark|workspace-profile|profile-avatar)"/, '임의의 회사 로고 또는 팀 프로필이 게시판에 남아 있습니다.');
assert.match(boardShell, /<a class="brand"[^>]*>자료분석<\/a>/, '좌측 상단에는 사용자가 지정한 자료분석만 표시해야 합니다.');
assert.equal(data.documents.length, catalog.documents.length);
assert.equal(new Set(data.documents.map((doc) => doc.slug)).size, data.documents.length);
for (const doc of catalog.documents) {
  const original = await fs.readFile(path.join(root, 'content', doc.file));
  const published = await fs.readFile(path.join(output, 'materials', doc.file));
  assert.equal(hash(original), hash(published), `원문이 변경되었습니다: ${doc.file}`);
  assert.equal(hash(published), doc.sha256);
  const reader = await fs.readFile(path.join(output, 'docs', doc.slug, 'index.html'), 'utf8');
  assert.match(reader, /<iframe[^>]*title="[^"]+"/);
  assert.match(reader, /class="reader-back" href="\.\.\/\.\.\/"/);
  assert.ok(index.includes(`./docs/${doc.slug}/`), `게시판에 자료 링크가 없습니다: ${doc.slug}`);
}
let referenceCount = 0;
for (const file of (await filesIn(output)).filter((file) => /\.html?$/.test(file) && !file.startsWith('materials/'))) {
  const html = await fs.readFile(path.join(output, file), 'utf8');
  assert.match(html, /<html lang="ko"/);
  assert.match(html, /name="viewport"/);
  for (const [, reference] of html.matchAll(/(?:src|href)="([^"]+)"/g)) {
    if (/^(?:[a-z][a-z\d+.-]*:|\/\/|#|\?)/i.test(reference)) continue;
    const relative = decodeURIComponent(reference.split(/[?#]/)[0]);
    const resolved = path.resolve(output, path.dirname(file), relative);
    assert.ok(!path.relative(output, resolved).startsWith('..'), `게시 범위 밖의 참조: ${reference}`);
    await fs.access(resolved);
    referenceCount++;
  }
}
for (const file of ['app.js', 'reader.js']) new vm.Script(await fs.readFile(path.join(output, 'assets', file), 'utf8'), { filename: file });
assert.equal(catalog.categories.reduce((sum, category) => sum + category.count, 0), catalog.documents.length);
assert.ok(!index.includes('\\\\PO_FILE'));
assert.ok(!index.includes('github_pat_'));
console.log(`검증 통과: 자료 ${catalog.documents.length}개 원문 SHA-256 동일, 개별 페이지·연결 ${referenceCount}개 유효, 분류 합계·게시판 스크립트 확인.`);
