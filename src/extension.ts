import { workspace, type ExtensionContext } from 'vscode';
import {
  LanguageClient,
  type LanguageClientOptions,
  type ServerOptions,
  TransportKind,
} from 'vscode-languageclient/node';

let client: LanguageClient | undefined;

export function activate(_context: ExtensionContext): void {
  const kingletPath = workspace.getConfiguration('kinglet').get<string>('path', 'kinglet');

  const serverOptions: ServerOptions = {
    run: { command: kingletPath, args: ['lsp'], transport: TransportKind.stdio },
    debug: { command: kingletPath, args: ['lsp'], transport: TransportKind.stdio },
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
