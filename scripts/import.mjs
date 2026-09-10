import fs from 'node:fs/promises';
import path from 'node:path';
import { root, filesIn, readJSON, hash } from './lib.mjs';

const argument = process.argv.indexOf('--from');
if (argument < 0 || !process.argv[argument + 1]) {
  console.error('사용법: npm run import -- --from "자료조사 폴더의 전체 경로"');
  process.exit(1);
}
const source = path.resolve(process.argv[argument + 1]);
const target = path.join(root, 'content');
if (source === target || source.startsWith(target + path.sep) || target.startsWith(source + path.sep)) throw new Error('원본과 게시 폴더는 서로 독립된 위치여야 합니다.');
const allowed = new Set(['.html', '.htm', '.css', '.js', '.mjs', '.png', '.jpg', '.jpeg', '.webp', '.svg', '.gif', '.ico', '.woff', '.woff2', '.ttf', '.avif', '.mp4', '.webm', '.pdf', '.csv']);
const files = (await filesIn(source)).filter((file) => allowed.has(path.extname(file).toLowerCase()));
await fs.mkdir(target, { recursive: true });
const registryFile = path.join(target, '.source-info.json');
const registry = await readJSON(registryFile, {});
const pending = [];
for (const file of files) {
  const bytes = await fs.readFile(path.join(source, file));
  const digest = hash(bytes);
  let existing;
  try { existing = await fs.readFile(path.join(target, file)); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  if (existing && hash(existing) !== digest && hash(existing) !== registry[file]?.sha256) {
    throw new Error(`로컬 수정과 충돌합니다. 원본과 게시용 파일을 비교한 뒤 다시 가져오세요: ${file}`);
  }
  const stat = await fs.stat(path.join(source, file));
  pending.push({ file, bytes, digest, stat, changed: !existing || hash(existing) !== digest });
}
for (const item of pending) {
  if (item.changed) {
    await fs.mkdir(path.dirname(path.join(target, item.file)), { recursive: true });
    await fs.writeFile(path.join(target, item.file), item.bytes);
    await fs.utimes(path.join(target, item.file), item.stat.atime, item.stat.mtime);
  }
  registry[item.file] = { sha256: item.digest, updatedAt: item.stat.mtime.toISOString() };
}
await fs.writeFile(registryFile, JSON.stringify(registry, null, 2) + '\n');
console.log(`자료 가져오기 완료: ${pending.filter((file) => file.changed).length}개 추가/갱신, ${files.length}개 확인. 원본과 기존 미포함 자료는 보존했습니다.`);
