import { build } from 'esbuild';
import * as fs from 'fs';
import * as path from 'path';

const distDir = 'dist';

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

const ensureDist = () => {
  if (fs.existsSync(distDir)) {
    fs.rmSync(distDir, { recursive: true, force: true });
  }
  fs.mkdirSync(distDir);
};

const copyHtmlDir = (dir: string) => {
  if (!fs.existsSync(dir)) {
    return;
  }
  fs.readdirSync(dir).forEach((file) => {
    const srcPath = path.join(dir, file);
    if (fs.statSync(srcPath).isDirectory()) {
      return;
    }
    if (!file.endsWith('.html')) {
      return;
    }
    const destPath = path.join(distDir, file);
    fs.copyFileSync(srcPath, destPath);
    console.log(`${file} copied from ${dir}.`);
  });
};

async function buildServerBundle() {
  await build({
    entryPoints: ['src/Code.ts'],
    bundle: true,
    outfile: path.join(distDir, 'Code.js'),
    target: 'es2020',
    format: 'iife',
    globalName: '_entry',
    banner: {
      js: gasShim,
    },
  });
  console.log('Server bundle complete.');
}

async function buildFrontendBundle() {
  const result = await build({
    entryPoints: ['src/frontend/main.ts'],
    bundle: true,
    write: false,
    format: 'iife',
    target: 'es2020',
    platform: 'browser',
    outfile: 'frontend.js',
  });

  const output = result.outputFiles?.[0];
  if (!output) {
    throw new Error('Frontend bundle failed: no output files.');
  }
  const scriptContent = `<script>${output.text}</script>`;
  fs.writeFileSync(path.join(distDir, 'scripts_bundle.html'), scriptContent);
  console.log('Frontend bundle written to scripts_bundle.html');
}

async function copyStaticFiles() {
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

  if (fs.existsSync('src/index.html')) {
    fs.copyFileSync('src/index.html', path.join(distDir, 'index.html'));
    console.log('index.html copied.');
  }

  copyHtmlDir(path.join('src', 'partials'));
  copyHtmlDir(path.join('src', 'styles'));
}

async function run() {
  try {
    ensureDist();
    await buildServerBundle();
    await buildFrontendBundle();
    await copyStaticFiles();
    console.log('Build complete.');
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
}

run();
