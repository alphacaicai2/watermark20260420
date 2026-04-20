# PDF Fixed Watermark Tool

Fixed-template PDF text watermark tool for local scripts, CLI usage, and MCP clients.

Chinese, Japanese, and Korean text work out of the box — no font configuration needed.

## Install

```bash
npm install
npm run build
```

`postinstall` automatically downloads the bundled [Noto Sans CJK](https://github.com/notofonts/noto-cjk) font into `fonts/`. After that, common CJK watermark text works without extra options.

## CLI

```bash
pdfwm add --input ./source.pdf --text "机密"
pdfwm add --input ./source.pdf --text "CONFIDENTIAL" --output ./out.pdf
pdfwm standard --input ./source.pdf --text "Demo Version"
```

Options:

- `--input`: input PDF path, required
- `--text`: single-line watermark text, required
- `--output`: output PDF path, optional
- `--template`: template name, default `standard`
- `--font`: custom font file path (overrides bundled font)
- `--config`: config file path, optional

## NPM API

```ts
import { watermarkPdf } from 'pdf-fixed-watermark-tool';

const result = await watermarkPdf({
  inputPath: './source.pdf',
  text: '机密',           // CJK works out of the box
  outputPath: './out.pdf'
});

console.log(result.outputPath);
```

## Config

The CLI automatically reads `watermark.config.json` from the current working directory.
The bundled config already points to the downloaded CJK font:

```json
{
  "defaultTemplate": "standard",
  "defaultOutputDir": "./output",
  "defaultFontPath": "./fonts/NotoSansCJKsc-Regular.otf",
  "templates": {
    "standard": {
      "fontSize": 56,
      "opacity": 0.12,
      "rotation": 45,
      "colorRgb": [0.6, 0.6, 0.6],
      "position": "center"
    }
  }
}
```

You can override `defaultFontPath` with any `.ttf`, `.otf`, or `.ttc` file.

## MCP Server

Run the local stdio MCP server:

```bash
node ./dist/mcp.js
```

Tool name: `add_pdf_watermark`

Minimum input (font is resolved automatically):

```json
{
  "input_path": "./source.pdf",
  "watermark_text": "机密"
}
```

Full input:

```json
{
  "input_path": "./source.pdf",
  "watermark_text": "CONFIDENTIAL",
  "output_path": "./out.pdf",
  "template": "standard",
  "font_path": "/optional/custom/font.ttc"
}
```

## Remote MCP on Railway

This project can also run as a remote Streamable HTTP MCP server on Railway.

Required Railway variables:

- `PDFWM_API_KEY`: bearer token required by `/mcp` and `/files`
- `PUBLIC_BASE_URL`: optional public URL, for example `https://your-service.up.railway.app`

Railway uses `npm start`, which runs:

```bash
node dist/remote.js
```

Remote MCP URL:

```text
https://your-service.up.railway.app/mcp
```

Remote Agent config:

```json
{
  "mcpServers": {
    "pdf-watermark": {
      "type": "streamable-http",
      "url": "https://your-service.up.railway.app/mcp",
      "headers": {
        "Authorization": "Bearer YOUR_PDFWM_API_KEY"
      }
    }
  }
}
```

Remote tool input uses a PDF URL because the Railway server cannot read local
paths on your computer:

```json
{
  "input_url": "https://example.com/source.pdf",
  "watermark_text": "仅供内部使用"
}
```

Successful remote calls return `download_url`. Download URLs are also protected
by the same bearer token.

### MCP config for Claude Desktop

`~/Library/Application Support/Claude/claude_desktop_config.json` (macOS)
`%APPDATA%\Claude\claude_desktop_config.json` (Windows)

```json
{
  "mcpServers": {
    "pdf-watermark": {
      "command": "node",
      "args": ["/path/to/watermark20260420/dist/mcp.js"],
      "cwd": "/path/to/watermark20260420"
    }
  }
}
```

### MCP config for Codex CLI

`~/.codex/config.json`

```json
{
  "mcpServers": {
    "pdf-watermark": {
      "type": "stdio",
      "command": "node",
      "args": ["/path/to/watermark20260420/dist/mcp.js"],
      "cwd": "/path/to/watermark20260420"
    }
  }
}
```

### MCP config for Cline (VS Code)

`settings.json`

```json
{
  "cline.mcpServers": {
    "pdf-watermark": {
      "command": "node",
      "args": ["/path/to/watermark20260420/dist/mcp.js"],
      "cwd": "/path/to/watermark20260420",
      "transport": "stdio"
    }
  }
}
```

> **`cwd` is required** — the MCP server resolves `watermark.config.json` and
> `./fonts/NotoSansCJKsc-Regular.otf` relative to the working directory.

## Font resolution order

1. `font_path` / `--font` argument (explicit override)
2. `defaultFontPath` in `watermark.config.json` (bundled CJK font by default)
3. Bundled package font auto-detected from `fonts/` when no config font is provided
4. Built-in Helvetica for ASCII text when no custom or bundled font is available

## Errors

Failures are explicit. The API throws `WatermarkError` with a stable `code`.
The CLI prints `CODE: message` and exits with code `1`.

Common codes:

- `INPUT_NOT_FOUND`
- `INPUT_NOT_PDF`
- `OUTPUT_EQUALS_INPUT`
- `OUTPUT_NOT_WRITABLE`
- `WATERMARK_TEXT_EMPTY`
- `WATERMARK_TEXT_MULTILINE`
- `TEMPLATE_NOT_FOUND`
- `FONT_NOT_FOUND`
- `FONT_UNSUPPORTED_CHARACTERS`
- `PDF_LOAD_FAILED`
- `CONFIG_INVALID`

## Validation

```bash
npm run typecheck
npm run test -- --run --testTimeout=60000
npm run build
```
