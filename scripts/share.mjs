import { spawn, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { chmod, mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { createServer } from 'node:net';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = fileURLToPath(new URL('../', import.meta.url));
process.chdir(root);
if (existsSync('.env')) process.loadEnvFile('.env');
const port = Number(process.env.PORT || 2567);
const children = new Set();
let stopping = false;
function stop(code = 0) {
  if (stopping) return;
  stopping = true;
  for (const child of children) child.kill('SIGTERM');
  process.exitCode = code;
}
process.on('SIGINT', () => stop());
process.on('SIGTERM', () => stop());
function launch(command, args, options = {}) {
  const child = spawn(command, args, { cwd: root, stdio: 'inherit', ...options });
  children.add(child);
  child.on('error', (error) => { console.error(error.message); stop(1); });
  child.on('exit', (code) => { children.delete(child); if (!stopping) stop(code || 1); });
  return child;
}

// Official release, pinned checksums. No admin rights or global install needed.
const release = '2026.9.1';
const downloads = {
  'linux-x64': ['cloudflared-linux-amd64', '03f1f25d1cc93b9ad6c60569d44060bc4f17ed97075760ed8cfca4b12dcd68cc'],
  'linux-arm64': ['cloudflared-linux-arm64', '3d97437c71848bd8df68041e12436b484a661d95073ea1937f01a845ce88faa3'],
  'win32-x64': ['cloudflared-windows-amd64.exe', '2837888cc0f5d58f15b6dc478376de90b4d3ba5241c7947455d1e0a0df429712'],
};
async function cloudflared() {
  if (spawnSync('cloudflared', ['--version'], { stdio: 'ignore' }).status === 0) return 'cloudflared';
  const asset = downloads[`${process.platform}-${process.arch}`];
  if (!asset) throw new Error('Bitte cloudflared installieren: https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/downloads/');
  const [name, checksum] = asset;
  const binary = path.join(root, '.tools', `${release}-${name}`);
  await mkdir(path.dirname(binary), { recursive: true });
  const valid = (bytes) => createHash('sha256').update(bytes).digest('hex') === checksum;
  if (!existsSync(binary) || !valid(await readFile(binary))) {
    console.log(`Lade cloudflared ${release} von github.com/cloudflare/cloudflared ...`);
    const response = await fetch(`https://github.com/cloudflare/cloudflared/releases/download/${release}/${name}`, { signal: AbortSignal.timeout(120_000) });
    if (!response.ok) throw new Error(`Download fehlgeschlagen: HTTP ${response.status}`);
    const bytes = Buffer.from(await response.arrayBuffer());
    if (!valid(bytes)) throw new Error('cloudflared-Prüfsumme stimmt nicht. Download wird nicht ausgeführt.');
    await writeFile(`${binary}.tmp`, bytes);
    await rename(`${binary}.tmp`, binary);
  }
  await chmod(binary, 0o755);
  return binary;
}

try {
  if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Ungültiger PORT in .env.');
  // Never expose a different, already running service by accident.
  await new Promise((resolve, reject) => {
    const probe = createServer();
    probe.once('error', () => reject(new Error(`Port ${port} ist belegt. Stoppe npm start/dev oder ändere PORT in .env.`)));
    probe.listen(port, '127.0.0.1', () => probe.close(resolve));
  });
  const binary = await cloudflared();
  if (!stopping) {
    const server = launch(process.execPath, ['--import', 'tsx', 'server/src/index.ts'], {
      env: { ...process.env, PORT: String(port) },
    });
    let healthy = false;
    for (let attempt = 0; attempt < 100 && !stopping; attempt++) {
      try {
        const response = await fetch(`http://127.0.0.1:${port}/health`, { signal: AbortSignal.timeout(500) });
        healthy = response.ok && (await response.json()).room === 'mensch';
        if (healthy) break;
      } catch { /* Wait for this server to finish starting. */ }
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    if (!healthy || server.exitCode !== null) throw new Error('Spielserver konnte nicht gestartet werden.');
    // An explicit empty config avoids conflicts with existing named tunnels.
    await mkdir('.tools', { recursive: true });
    await writeFile('.tools/quick-tunnel.yml', '{}\n');
    if (!stopping) {
      console.log(`Lokal: http://127.0.0.1:${port}\nTeile gleich die https://…trycloudflare.com-Adresse UND deinen Raumcode. Strg+C beendet beides.`);
      launch(binary, ['tunnel', '--config', path.join(root, '.tools/quick-tunnel.yml'), '--no-autoupdate', '--url', `http://127.0.0.1:${port}`]);
    }
  }
} catch (error) {
  console.error(error.message);
  stop(1);
}
