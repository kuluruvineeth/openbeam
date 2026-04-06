type McpClient = {
  id: string;
  name: string;
  configGenerator: (apiKey: string, serverUrl: string) => string;
  setupSteps: string[];
  deepLink?: (apiKey: string, serverUrl: string) => string;
  configPath?: string;
  docsUrl?: string;
};

const MCP_SERVER_URL =
  process.env.NEXT_PUBLIC_MCP_SERVER_URL ?? "https://api.openbeam.work/mcp";

const MCP_CLIENTS: McpClient[] = [
  {
    id: "claude-desktop",
    name: "Claude Desktop",
    configGenerator: (_apiKey, url) =>
      [
        "1. Open Claude Desktop → Settings → Connectors",
        '2. Click "Add custom connector"',
        "3. Name: OpenBeam",
        `4. Remote MCP server URL: ${url}`,
        "5. Click Add — OAuth will handle authentication automatically",
      ].join("\n"),
    setupSteps: [
      "Open Claude Desktop → Settings → Connectors",
      'Click "Add custom connector"',
      "Enter OpenBeam as the name",
      "Paste the server URL below",
      "Click Add — you'll be redirected to authorize via OAuth",
    ],
    docsUrl:
      "https://support.claude.com/en/articles/11503834-building-custom-connectors-via-remote-mcp-servers",
  },
  {
    id: "claude-code",
    name: "Claude Code",
    configGenerator: (apiKey, url) =>
      `claude mcp add --transport http openbeam ${url} --header "Authorization: Bearer ${apiKey}"`,
    setupSteps: [
      "Run the command below in your terminal",
      "Claude Code will automatically configure the MCP server",
      "Use --scope user to make it available across all projects",
    ],
    docsUrl: "https://code.claude.com/docs/en/mcp",
  },
  {
    id: "cursor",
    name: "Cursor",
    configGenerator: (apiKey, url) =>
      JSON.stringify(
        {
          mcpServers: {
            openbeam: {
              url,
              headers: { Authorization: `Bearer ${apiKey}` },
            },
          },
        },
        null,
        2
      ),
    setupSteps: [
      "Add to .cursor/mcp.json in your project (or ~/.cursor/mcp.json globally)",
      "Or use the one-click install link below",
      "Restart Cursor after adding the configuration",
    ],
    deepLink: (apiKey, url) => {
      const config = JSON.stringify({
        url,
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      return `cursor://anysphere.cursor-deeplink/mcp/install?name=openbeam&config=${encodeURIComponent(btoa(config))}`;
    },
    configPath: ".cursor/mcp.json",
    docsUrl: "https://cursor.com/docs/context/mcp/install-links",
  },
  {
    id: "windsurf",
    name: "Windsurf",
    configGenerator: (apiKey, url) =>
      JSON.stringify(
        {
          mcpServers: {
            openbeam: {
              serverUrl: url,
              headers: { Authorization: `Bearer ${apiKey}` },
            },
          },
        },
        null,
        2
      ),
    setupSteps: [
      "Add to ~/.codeium/windsurf/mcp_config.json",
      "Or open Windsurf → Cascade panel → MCP icon → Configure",
      "Note: Windsurf uses serverUrl (not url)",
    ],
    configPath: "~/.codeium/windsurf/mcp_config.json",
    docsUrl: "https://docs.windsurf.com/windsurf/cascade/mcp",
  },
  {
    id: "vscode",
    name: "VS Code / Copilot",
    configGenerator: (apiKey, url) =>
      JSON.stringify(
        {
          servers: {
            openbeam: {
              type: "http",
              url,
              headers: { Authorization: `Bearer ${apiKey}` },
            },
          },
        },
        null,
        2
      ),
    setupSteps: [
      "Add to .vscode/mcp.json in your workspace",
      'Or open Command Palette → "MCP: Open User Configuration"',
      'Note: VS Code uses "servers" (not "mcpServers")',
    ],
    configPath: ".vscode/mcp.json",
    docsUrl:
      "https://code.visualstudio.com/docs/copilot/customization/mcp-servers",
  },
  {
    id: "cline",
    name: "Cline",
    configGenerator: (apiKey, url) =>
      JSON.stringify(
        {
          mcpServers: {
            openbeam: {
              url,
              headers: { Authorization: `Bearer ${apiKey}` },
            },
          },
        },
        null,
        2
      ),
    setupSteps: [
      "Open Cline → MCP Servers icon → Configure tab",
      "Click Configure MCP Servers",
      "Add the configuration below",
    ],
    docsUrl: "https://docs.cline.bot/mcp/configuring-mcp-servers",
  },
  {
    id: "codex",
    name: "Codex",
    configGenerator: (apiKey, url) =>
      `codex --mcp-server openbeam=${url} --mcp-header openbeam="Authorization: Bearer ${apiKey}"`,
    setupSteps: [
      "Run Codex with the MCP flags below",
      "Or add to your codex config file",
    ],
    docsUrl: "https://github.com/openai/codex",
  },
  {
    id: "chatgpt",
    name: "ChatGPT",
    configGenerator: (_apiKey, url) =>
      [
        "1. Enable Developer Mode: Workspace Settings → Permissions → Developer mode",
        "2. Go to Settings → Apps & Connectors → Advanced → Developer Mode",
        `3. Add MCP server URL: ${url}`,
        "4. OAuth will handle authentication automatically",
        "",
        "Requires ChatGPT Business, Enterprise, or Education plan.",
      ].join("\n"),
    setupSteps: [
      "Requires Business, Enterprise, or Education plan with Developer Mode",
      "Go to Settings → Apps & Connectors → Developer Mode",
      "Add the server URL — OAuth handles auth automatically",
    ],
    docsUrl: "https://developers.openai.com/api/docs/mcp",
  },
  {
    id: "continue",
    name: "Continue",
    configGenerator: (apiKey, url) =>
      JSON.stringify(
        {
          experimental: {
            modelContextProtocolServers: [
              {
                transport: {
                  type: "sse",
                  url,
                  headers: { Authorization: `Bearer ${apiKey}` },
                },
              },
            ],
          },
        },
        null,
        2
      ),
    setupSteps: [
      "Add to ~/.continue/config.json",
      "Continue uses an array under experimental.modelContextProtocolServers",
      "Restart the Continue extension after saving",
    ],
    configPath: "~/.continue/config.json",
    docsUrl: "https://docs.continue.dev",
  },
  {
    id: "opencode",
    name: "OpenCode",
    configGenerator: (apiKey, url) =>
      [
        "[mcp.openbeam]",
        'type = "remote"',
        `url = "${url}"`,
        "",
        "[mcp.openbeam.headers]",
        `Authorization = "Bearer ${apiKey}"`,
      ].join("\n"),
    setupSteps: [
      "Add to ~/.config/opencode/config.toml",
      "OpenCode uses TOML format for MCP configuration",
      "Restart OpenCode after saving",
    ],
    configPath: "~/.config/opencode/config.toml",
    docsUrl: "https://opencode.ai",
  },
];

export { MCP_CLIENTS, MCP_SERVER_URL, type McpClient };
