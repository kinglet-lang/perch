#!/usr/bin/env node
/**
 * Copy the built kinglet-lsp binary (and Windows runtime DLLs) into bin/
 * before `vsce package`.
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const root = path.join(__dirname, '..');
const isWin = process.platform === 'win32';
const src = path.join(root, 'out', 'Default', isWin ? 'kinglet-lsp.exe' : 'kinglet-lsp');
const destDir = path.join(root, 'bin');
const dest = path.join(destDir, isWin ? 'kinglet-lsp.exe' : 'kinglet-lsp');

const WIN_RUNTIME_DLLS = ['libstdc++-6.dll', 'libgcc_s_seh-1.dll'];
const COPY_RETRIES = 8;
const COPY_RETRY_MS = 400;

function sleep(ms) {
  if (isWin) {
    execFileSync('ping', ['-n', String(Math.max(2, Math.ceil(ms / 500) + 1)), '127.0.0.1'], {
      stdio: 'ignore',
    });
    return;
  }
  execFileSync('sleep', [String(Math.max(1, Math.ceil(ms / 1000)))], { stdio: 'ignore' });
}

function stopRunningServer() {
  if (!isWin) {
    return;
  }
  try {
    execFileSync('taskkill', ['/F', '/IM', 'kinglet-lsp.exe'], { stdio: 'ignore' });
    console.log('Stopped running kinglet-lsp.exe (was locking bin/ during package).');
    sleep(500);
  } catch {
    // not running
  }
}

function copyFileWithRetry(from, to) {
  let lastError;
  for (let attempt = 1; attempt <= COPY_RETRIES; attempt += 1) {
    try {
      fs.copyFileSync(from, to);
      return;
    } catch (err) {
      lastError = err;
      if (err.code !== 'EBUSY' && err.code !== 'EPERM') {
        throw err;
      }
      if (attempt < COPY_RETRIES) {
        console.log(`Copy locked (${path.basename(to)}), retry ${attempt}/${COPY_RETRIES}...`);
        sleep(COPY_RETRY_MS);
      }
    }
  }
  throw lastError;
}

function findMingwBin() {
  const candidates = [
    process.env.MINGW_PREFIX ? path.join(process.env.MINGW_PREFIX, 'bin') : null,
    'C:\\msys64\\mingw64\\bin',
    'C:\\msys64\\ucrt64\\bin',
  ].filter(Boolean);
  for (const dir of candidates) {
    if (fs.existsSync(path.join(dir, 'libstdc++-6.dll'))) {
      return dir;
    }
  }
  return undefined;
}

function stageRuntimeDlls() {
  if (!isWin) {
    return;
  }

  const mingwBin = findMingwBin();
  if (!mingwBin) {
    console.warn(
      'Warning: MSYS2 MinGW not found. kinglet-lsp.exe needs libstdc++-6.dll and libgcc_s_seh-1.dll next to the binary.',
    );
    return;
  }

  for (const dll of WIN_RUNTIME_DLLS) {
    const from = path.join(mingwBin, dll);
    const to = path.join(destDir, dll);
    if (!fs.existsSync(from)) {
      console.warn(`Warning: missing ${from}`);
      continue;
    }
    copyFileWithRetry(from, to);
    console.log(`Staged ${dll}`);
  }
}

function smokeTestServer() {
  if (!isWin) {
    return;
  }

  const init = JSON.stringify({
    jsonrpc: '2.0',
    id: 1,
    method: 'initialize',
    params: { capabilities: {} },
  });
  const payload = `Content-Length: ${Buffer.byteLength(init, 'utf8')}\r\n\r\n${init}`;

  try {
    const stdout = execFileSync(dest, [], {
      input: payload,
      timeout: 5000,
      env: { ...process.env, PATH: 'C:\\Windows\\System32;C:\\Windows' },
      windowsHide: true,
    }).toString('utf8');
    if (!stdout.includes('"capabilities"')) {
      console.warn('Warning: LSP smoke test did not return capabilities.');
    } else {
      console.log('LSP smoke test OK (bundled runtime loads without MSYS2 on PATH).');
    }
  } catch (err) {
    console.warn(`Warning: LSP smoke test failed: ${err.message}`);
  }
}

function failLockedCopy(err) {
  console.error(`Failed to stage ${path.relative(root, dest)}: ${err.message}`);
  console.error('');
  console.error('bin/kinglet-lsp.exe is in use — usually VS Code is running the language server.');
  console.error('Close VS Code (or reload the window), then run:');
  console.error('  Stop-Process -Name kinglet-lsp -Force -ErrorAction SilentlyContinue');
  console.error('  npm run package');
  process.exit(1);
}

if (!fs.existsSync(src)) {
  console.error(`Missing LSP binary: ${src}`);
  console.error('Build it first: ninja -C out/Default kinglet-lsp');
  process.exit(1);
}

stopRunningServer();
fs.mkdirSync(destDir, { recursive: true });

try {
  copyFileWithRetry(src, dest);
} catch (err) {
  if (err.code === 'EBUSY' || err.code === 'EPERM') {
    failLockedCopy(err);
  }
  throw err;
}

console.log(`Staged ${path.relative(root, src)} → ${path.relative(root, dest)}`);

stageRuntimeDlls();
smokeTestServer();
