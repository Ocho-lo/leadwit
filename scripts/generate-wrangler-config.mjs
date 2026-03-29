/**
 * 根据 wrangler.jsonc 生成 .wrangler.generated.jsonc。
 * 若在环境变量或 .env.local 中设置了 CUSTOM_WORKER_HOST（例如 app.example.com），
 * 则写入 routes + custom_domain，部署后可通过该域名访问 Worker。
 */
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const srcPath = resolve(root, 'wrangler.jsonc');
const outPath = resolve(root, '.wrangler.generated.jsonc');

function loadEnvLocal() {
  const p = resolve(root, '.env.local');
  if (!existsSync(p)) return {};
  const txt = readFileSync(p, 'utf8');
  const env = {};
  for (const line of txt.split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const eq = t.indexOf('=');
    if (eq === -1) continue;
    const k = t.slice(0, eq).trim();
    let v = t.slice(eq + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    env[k] = v;
  }
  return env;
}

const localEnv = loadEnvLocal();
const host = (process.env.CUSTOM_WORKER_HOST || localEnv.CUSTOM_WORKER_HOST || '').trim();

let raw = readFileSync(srcPath, 'utf8');
raw = raw.replace(/^\s*\/\/[^\n]*\n/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
const cfg = JSON.parse(raw);

if (host) {
  cfg.routes = [{ pattern: host, custom_domain: true }];
} else {
  delete cfg.routes;
}

writeFileSync(outPath, JSON.stringify(cfg, null, 2) + '\n');

if (host) {
  console.log(`[wrangler] 已生成部署配置，自定义域名: https://${host}`);
} else {
  console.log('[wrangler] 未设置 CUSTOM_WORKER_HOST，仅使用 *.workers.dev（可在 .env.local 中设置该变量后重新 deploy）');
}
