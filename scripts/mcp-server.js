#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";

const server = new Server({ name: "aurion-ledger-server", version: "1.0.0" }, { capabilities: { tools: {} } });

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [{
    name: "query_ledger",
    description: "Query the aurion_ledger for market cap and agent logs",
    inputSchema: { type: "object", properties: { query: { type: "string" } }, required: ["query"] }
  }]
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name === "query_ledger") {
    // This is where you call your database or run your logic
    return { content: [{ type: "text", text: `Ledger Query Executed: ${request.params.arguments.query}` }] };
  }
  throw new Error("Tool not found");
});

const transport = new StdioServerTransport();
await server.connect(transport);
