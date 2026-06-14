#!/usr/bin/env bash
# Link bootstrap compiler sources for GN (local dev).
# In CI, use: git submodule update --init third_party/bootstrap
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BOOTSTRAP="${BOOTSTRAP_ROOT:-$ROOT/../bootstrap}"

if [[ ! -f "$BOOTSTRAP/BUILD.gn" ]]; then
  echo "bootstrap not found at $BOOTSTRAP" >&2
  echo "  git submodule update --init third_party/bootstrap" >&2
  echo "  or: BOOTSTRAP_ROOT=/path/to/bootstrap $0" >&2
  exit 1
fi

link_dir() {
  local name="$1"
  local target="$2"
  local path="$ROOT/$name"
  if [[ -L "$path" || -d "$path" ]]; then
    rm -rf "$path"
  fi
  ln -s "$target" "$path"
}

mkdir -p "$ROOT/build" "$ROOT/third_party"
link_dir third_party/bootstrap "$BOOTSTRAP"
link_dir build/config "$BOOTSTRAP/build/config"
link_dir build/toolchain "$BOOTSTRAP/build/toolchain"
link_dir src "$BOOTSTRAP/src"

echo "linked bootstrap from $BOOTSTRAP"
