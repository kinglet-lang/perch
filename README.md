# Perch

Editor tooling for [Kinglet](https://github.com/kinglet-lang/kinglet): VS Code extension and LSP client.

Perch does **not** implement the language server. It spawns `kinglet lsp` (from the self-hosted compiler) over stdio and adapts it to VS Code.

## Status

Early scaffold — syntax highlighting and LSP client wiring. The `kinglet lsp` subcommand is not shipped yet ([ADR 0004](https://github.com/kinglet-lang/kinglet/blob/main/decisions/0004-lsp-roadmap.md)).

## Development

```bash
npm install
npm run compile
```

Press **F5** in VS Code to launch an Extension Development Host with Perch loaded.

## Settings

| Setting | Default | Description |
|---------|---------|-------------|
| `kinglet.path` | `kinglet` | Path to the compiler binary |
| `kinglet.trace.server` | `off` | LSP trace level (`off`, `messages`, `verbose`) |

## License

MIT
