import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { MongoClient, ServerApiVersion } from "mongodb";

if (!process.env.MONGODB_URI) {
  console.error("MONGODB_URI environment variable is required");
  process.exit(1);
}

const client = new MongoClient(process.env.MONGODB_URI, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

try {
  await client.connect();
} catch (error) {
  console.error("Connection failed");
  process.exit(1);
}

console.log("Connection successful");

const CollectionArgumentsSchema = z.object({
  collection: z.string(),
  database: z.string(),
});

const server = new Server(
  {
    name: "mongodb",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "get-collection-documents",
        description: "Get documents for a collection",
        inputSchema: {
          type: "object",
          properties: {
            collection: {
              type: "string",
              description: "Mongodb Collection name",
            },
            database: {
              type: "string",
              description: "Mongodb Database name",
            },
          },
          required: ["collection", "database"],
        },
      },
    ],
  };
});


server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    if (name === "get-collection-documents") {
      const { collection, database } = CollectionArgumentsSchema.parse(args);
      const db = client.db(database);
      const coll = db.collection(collection);
      const result = await coll.find().toArray();
      return {
        content: [
          {
            type: "list",
            list: result,
          },
        ],
      };
    } else {
      return {
        content: [
          {
            type: "text",
            text: "Invalid request name",
          },
        ],
      };
    }
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: error || "An error occurred",
        },
      ],
    };
  }
});

const transport = new StdioServerTransport();
await server.connect(transport);
console.log("MongoDB MCP Server running on stdio");
