#pragma once

#include <cctype>
#include <string>

namespace kinglet::lsp {

// Convert an LSP file URI to a local filesystem path.
inline std::string uri_to_path(std::string uri) {
  const std::string prefix = "file://";
  if (uri.rfind(prefix, 0) == 0) {
    uri = uri.substr(prefix.size());
  }
  // file:///C:/... on Windows → C:/...
  if (uri.size() >= 3 && uri[0] == '/' && std::isalpha(static_cast<unsigned char>(uri[1])) &&
      uri[2] == ':') {
    uri = uri.substr(1);
  }
  return uri;
}

} // namespace kinglet::lsp
