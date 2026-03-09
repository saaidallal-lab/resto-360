import express from 'express';
import cors from 'cors';
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { SSEClientTransport } from "@modelcontextprotocol/sdk/client/sse.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const app = express();
app.use(cors());
app.use(express.json());

const PORT = 3001;

// Global client reference
let mcpClient = null;

async function setupClient() {
    if (mcpClient) return mcpClient;

    // Connecting to the SSE endpoint of the datagouv MCP server
    const transport = new SSEClientTransport(
        new URL("https://mcp.data.gouv.fr/mcp")
    );

    const client = new Client(
        {
            name: "resto-360-proxy",
            version: "1.0.0",
        },
        {
            capabilities: {
                tools: {},
            },
        }
    );

    await client.connect(transport);
    mcpClient = client;
    return client;
}

app.get('/api/search', async (req, res) => {
    try {
        const { query, zipCode, department } = req.query;
        const client = await setupClient();

        // According to typical data.gouv MCP Server capabilities, they usually provide tools to search datasets
        // We will list tools first to find the relevant one.
        const tools = await client.listTools();

        // For now we'll dynamically search for 'alimconfiance' using the tool 'api_dataset_search' or similar if they expose it
        const searchTool = tools.tools.find(t => t.name === 'search_dataset_records' || t.name === 'search_dataset' || t.name.includes('search'));

        if (!searchTool) {
            return res.status(500).json({ error: "No search tool found on MCP server", tools });
        }

        const mcpResponse = await client.callTool({
            name: searchTool.name,
            arguments: {
                datasetQuery: "export_alimconfiance", // Might need adjustment based on exact MCP tool signature
                query: query ? query : "",
                // Usually MCP args for datasets are just generic text search strings:
            },
        });

        res.json(mcpResponse);

    } catch (error) {
        console.error("MCP Server Error:", error);
        res.status(500).json({ error: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`Backend proxy running on http://localhost:${PORT}`);
});
