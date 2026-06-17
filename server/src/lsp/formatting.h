#pragma once

#include "lsp/json.h"

#include <string>
#include <string_view>

namespace kinglet::lsp {

struct FormatDocumentResult {
  std::string formatted;
  std::string error;
};

FormatDocumentResult format_document_text(const std::string &file_path, std::string_view source);
json::Value document_range(const std::string &text);
json::Value make_formatting_edits(const std::string &original, const std::string &formatted);

} // namespace kinglet::lsp
