# kinglet-lsp

C++ [Language Server Protocol](https://microsoft.github.io/language-server-protocol/) implementation for [Kinglet](https://github.com/kinglet-lang/kinglet), plus the **Perch** VS Code extension (client only).

The server reuses the [bootstrap](https://github.com/kinglet-lang/bootstrap) compiler frontend (lexer, parser, checker, module loader). It does **not** live in the compiler repo.

## Layout

```
kinglet-lsp/
├── server/src/lsp/     # LSP protocol + analysis + completion
├── server/main.cc      # stdio entry point
├── src/                # → bootstrap/src (symlink; GN deps //src/*)
├── build/              # GN config + bootstrap toolchain/config links
├── kinglet-lsp         # wrapper script → out/Default/kinglet-lsp
└── package.json        # VS Code extension (spawns kinglet-lsp)
```

## Build (server)

Requires [GN](https://gn.googlesource.com/gn/), ninja, and a C++20 toolchain (clang++).

```bash
# One-time: link bootstrap sources (or git submodule update --init third_party/bootstrap)
bash scripts/setup-deps.sh

gn gen out/Default --args='is_debug=false'
ninja -C out/Default kinglet-lsp

./kinglet-lsp   # stdio LSP; VS Code / Perch spawn this
```

Windows (MSYS2 clang on PATH):

```powershell
gn gen out/Default --args='is_debug=false'
ninja -C out/Default kinglet-lsp
.\out\Default\kinglet-lsp.exe
```

## VS Code extension

```bash
npm install
npm run compile
```

Press **F5** to launch the Extension Development Host. Set `kinglet.lspPath` to your built binary if it is not on `PATH`.

## LSP features

- Diagnostics (parser + type checker)
- Completion (parser-driven)
- Go to definition, hover, document symbols
- Signature help, semantic tokens

## Settings

| Setting | Default | Description |
|---------|---------|-------------|
| `kinglet.lspPath` | `kinglet-lsp` | Language server binary |
| `kinglet.trace.server` | `off` | LSP trace level |

## License

MIT
