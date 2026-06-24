#!/usr/bin/env python3
"""Drive textDocument/didOpen on a kinglet.nest file and inspect the
publishDiagnostics notification.

Each case directory contains:
    kinglet.nest                       the manifest to open
    expected.json                      {"required": [msg, ...],
                                         "forbidden": [msg, ...]?}
                                       `required` substrings each must appear
                                       in at least one diagnostic; `forbidden`
                                       substrings must not appear in any.
    (any supporting .kl files referenced by modules{} for path existence checks)
"""
from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path


def read_message(stream) -> dict:
    headers: dict[str, str] = {}
    while True:
        line = stream.readline()
        if not line:
            raise EOFError("LSP server closed stdout")
        line = line.decode("utf-8").strip()
        if not line:
            break
        name, value = line.split(":", 1)
        headers[name.strip().lower()] = value.strip()
    length = int(headers["content-length"])
    body = stream.read(length)
    if not body:
        raise EOFError("empty LSP message body")
    return json.loads(body.decode("utf-8"))


def write_message(stream, payload: dict) -> None:
    body = json.dumps(payload, separators=(",", ":")).encode("utf-8")
    header = f"Content-Length: {len(body)}\r\n\r\n".encode("utf-8")
    stream.write(header + body)
    stream.flush()


def request(proc, req_id: int, method: str, params) -> dict:
    write_message(
        proc.stdin,
        {"jsonrpc": "2.0", "id": req_id, "method": method, "params": params},
    )
    while True:
        message = read_message(proc.stdout)
        if message.get("id") == req_id:
            if "error" in message:
                raise RuntimeError(f"{method} failed: {message['error']}")
            return message["result"]


def notify(proc, method: str, params: dict) -> None:
    write_message(proc.stdin, {"jsonrpc": "2.0", "method": method, "params": params})


def main() -> int:
    if len(sys.argv) != 3:
        print(f"usage: {sys.argv[0]} <kinglet-lsp> <case-dir>", file=sys.stderr)
        return 2

    lsp_path = Path(sys.argv[1])
    case_dir = Path(sys.argv[2])
    nest_path = case_dir / "kinglet.nest"
    expected = json.loads((case_dir / "expected.json").read_text(encoding="utf-8"))

    source = nest_path.read_text(encoding="utf-8")
    uri = nest_path.resolve().as_uri()

    proc = subprocess.Popen(
        [str(lsp_path)],
        stdin=subprocess.PIPE,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
    )
    assert proc.stdin and proc.stdout

    diagnostics: list[dict] = []
    try:
        request(proc, 1, "initialize", {"processId": None, "rootUri": None, "capabilities": {}})
        notify(proc, "initialized", {})
        notify(
            proc,
            "textDocument/didOpen",
            {
                "textDocument": {
                    "uri": uri,
                    "languageId": "kinglet-nest",
                    "version": 1,
                    "text": source,
                }
            },
        )
        for _ in range(50):
            message = read_message(proc.stdout)
            if message.get("method") == "textDocument/publishDiagnostics":
                params = message.get("params", {})
                if params.get("uri") == uri:
                    diagnostics = params.get("diagnostics", [])
                    break
    finally:
        try:
            request(proc, 99, "shutdown", None)
        except Exception:
            pass
        notify(proc, "exit", {})
        proc.terminate()
        proc.wait(timeout=5)

    messages = [d.get("message", "") for d in diagnostics]
    failed = False
    for needle in expected.get("required", []):
        if not any(needle in m for m in messages):
            print(f"FAIL: required diagnostic substring not present: {needle!r}", file=sys.stderr)
            failed = True
    for needle in expected.get("forbidden", []):
        for m in messages:
            if needle in m:
                print(f"FAIL: forbidden diagnostic substring appeared: {needle!r} in {m!r}", file=sys.stderr)
                failed = True
                break
    if failed:
        print("actual diagnostics:", file=sys.stderr)
        for m in messages:
            print(f"  - {m}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as exc:
        print(f"FAIL: {exc}", file=sys.stderr)
        raise SystemExit(1)
