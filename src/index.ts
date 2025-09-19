import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const server = new McpServer({
  name: "horreum-mcp",
  version: "0.1.0"
});

// Minimal health tool to verify wiring
server.tool(
  "ping",
  "Ping the server to verify connectivity.",
  { message: z.string().optional() },
  async (args) => {
    const text = args?.message ?? "pong";
    return { content: [{ type: "text", text }] };
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);
