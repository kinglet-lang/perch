import * as fs from 'fs';
import * as path from 'path';
import { workspace, type ExtensionContext } from 'vscode';
import {
  LanguageClient,
  type LanguageClientOptions,
  type ServerOptions,
  TransportKind,
} from 'vscode-languageclient/node';

let client: LanguageClient | undefined;

function tryExecutable(candidate: string): string | undefined {
  if (fs.existsSync(candidate)) {
    return candidate;
  }
  if (process.platform === 'win32' && fs.existsSync(`${candidate}.exe`)) {
    return `${candidate}.exe`;
  }
  return undefined;
}

function resolveServerCommand(configured: string, extensionPath: string): string {
  const candidates: string[] = [];

  if (configured && configured !== 'kinglet-lsp') {
    candidates.push(configured);
    if (!path.isAbsolute(configured)) {
      candidates.push(path.join(extensionPath, configured));
    }
  }

  // Dev layout: extension repo root with GN output at out/Default/kinglet-lsp(.exe)
  candidates.push(path.join(extensionPath, 'out', 'Default', 'kinglet-lsp'));
  candidates.push(path.join(extensionPath, 'kinglet-lsp'));

  for (const candidate of candidates) {
    const resolved = tryExecutable(candidate);
    if (resolved) {
      return resolved;
    }
  }

  return configured || 'kinglet-lsp';
}

export function activate(context: ExtensionContext): void {
  const configured = workspace.getConfiguration('kinglet').get<string>('lspPath', 'kinglet-lsp');
  const lspPath = resolveServerCommand(configured, context.extensionPath);

  const serverOptions: ServerOptions = {
    run: { command: lspPath, args: [], transport: TransportKind.stdio },
    debug: { command: lspPath, args: [], transport: TransportKind.stdio },
  };

  const clientOptions: LanguageClientOptions = {
    documentSelector: [{ scheme: 'file', language: 'kinglet' }],
    synchronize: {
      fileEvents: workspace.createFileSystemWatcher('**/kinglet.toml'),
    },
  };

  client = new LanguageClient(
    'kinglet',
    'Kinglet Language Server',
    serverOptions,
    clientOptions,
  );

  void client.start();
}

export function deactivate(): Thenable<void> | undefined {
  return client?.stop();
}
