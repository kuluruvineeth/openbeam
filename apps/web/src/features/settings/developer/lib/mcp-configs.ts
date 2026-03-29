type McpClient = {
  id: string;
  name: string;
  configGenerator: (apiKey: string, serverUrl: string) => string;
  setupSteps: string[];
};

const MCP_SERVER_URL =
  process.env.NEXT_PUBLIC_MCP_SERVER_URL ?? "https://api.openbeam.ai/mcp";

const MCP_CLIENTS: McpClient[] = [
  {
    id: "claude-desktop",
    name: "Claude Desktop",
    configGenerator: (apiKey, url) =>
      JSON.stringify(
        {
          mcpServers: {
            openbeam: {
              command: "npx",
              args: [
                "-y",
                "mcp-remote@latest",
                url,
                "--header",
                // biome-ignore lint/suspicious/noTemplateCurlyInString: intentional env var reference in MCP config
                "Authorization:${AUTH_HEADER}",
              ],
              env: { AUTH_HEADER: `Bearer ${apiKey}` },
            },
          },
        },
        null,
        2
      ),
    setupSteps: [
      "Open Claude Desktop settings",
      "Navigate to Developer > MCP Servers",
      'Click "Edit Config" to open claude_desktop_config.json',
      "Paste the configuration below and save",
      "Restart Claude Desktop",
    ],
  },
  {
    id: "claude-code",
    name: "Claude Code",
    configGenerator: (apiKey, url) =>
      `claude mcp add --transport http openbeam ${url} --header "Authorization: Bearer ${apiKey}"`,
    setupSteps: [
      "Run the command below in your terminal",
      "Claude Code will automatically configure the MCP server",
    ],
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
      "Open Cursor settings (Cmd+,)",
      "Navigate to MCP Servers",
      'Click "Add MCP Server"',
      "Paste the configuration below",
    ],
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
      "Open Windsurf settings",
      "Navigate to MCP configuration",
      "Add the configuration below",
    ],
  },
  {
    id: "chatgpt",
    name: "ChatGPT / SDK",
    configGenerator: (apiKey, url) =>
      `import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

const client = new Client({ name: "my-app", version: "1.0.0" });

await client.connect(
  new StreamableHTTPClientTransport({
    url: "${url}",
    headers: { Authorization: "Bearer ${apiKey}" },
  })
);

const { tools } = await client.listTools();`,
    setupSteps: [
      "Install the MCP SDK: npm install @modelcontextprotocol/sdk",
      "Use the code below to connect programmatically",
    ],
  },
];

export { MCP_CLIENTS, MCP_SERVER_URL, type McpClient };
