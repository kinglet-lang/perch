#pragma once

#include <cstdlib>
#include <iostream>
#include <string>

namespace kinglet::lsp {

inline bool lsp_verbose() {
  static const bool on = [] {
    const char *env = std::getenv("KINGLET_LSP_LOG");
    return env != nullptr && env[0] != '\0' && env[0] != '0';
  }();
  return on;
}

inline void lsp_log(const std::string &msg) {
  if (lsp_verbose()) {
    std::cerr << "[LSP] " << msg << std::endl;
  }
}

} // namespace kinglet::lsp
