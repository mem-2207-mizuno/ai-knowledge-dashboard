import { build } from 'esbuild';
import * as fs from 'fs';
import * as path from 'path';

const distDir = 'dist';

// distディレクトリのクリーンアップ
if (fs.existsSync(distDir)) {
  fs.rmSync(distDir, { recursive: true, force: true });
}
fs.mkdirSync(distDir);

// GASのエントリーポイント用shimコード
const gasShim = `
var global = this;

function doGet(e) { return global.doGet(e); }
function getKnowledgeList(filters) { return global.getKnowledgeList(filters); }
function getKnowledgeDetail(id) { return global.getKnowledgeDetail(id); }
function addKnowledge(knowledge) { return global.addKnowledge(knowledge); }
function updateKnowledge(id, knowledge) { return global.updateKnowledge(id, knowledge); }
function addComment(id, comment, author) { return global.addComment(id, comment, author); }
function addLike(id) { return global.addLike(id); }
function testSpreadsheetAccess() { return global.testSpreadsheetAccess(); }
`;

// バンドル処理
build({
  entryPoints: ['src/Code.ts'],
  bundle: true,
  outfile: path.join(distDir, 'Code.js'),
  // GasPluginは使わず、自前でshimを追加する方式に変更
  target: 'es2020',
  format: 'iife', // 即時実行関数で囲む
  globalName: '_entry', // global汚染を防ぐ
  banner: {
    js: gasShim, // 先頭にshimを追加
  },
})
  .then(() => {
    console.log('Build complete.');

    // appsscript.jsonのコピー
    if (fs.existsSync('src/appsscript.json')) {
      fs.copyFileSync(
        'src/appsscript.json',
        path.join(distDir, 'appsscript.json')
      );
      console.log('appsscript.json copied from src.');
    } else if (fs.existsSync('appsscript.json')) {
      fs.copyFileSync('appsscript.json', path.join(distDir, 'appsscript.json'));
      console.log('appsscript.json copied from root.');
    }

    // index.htmlのコピー
    if (fs.existsSync('src/index.html')) {
      fs.copyFileSync('src/index.html', path.join(distDir, 'index.html'));
      console.log('index.html copied.');
    }
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
