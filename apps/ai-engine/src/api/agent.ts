import { FastifyInstance } from "fastify";
import { agentMessageSchema } from "../../../../packages/ai-lib/src/types/agent";
import { ensureAuth } from "../lib/auth";
import { orchestrateAgentMessage } from "../lib/rag";
import { executeTool } from "../lib/tools";

export const registerAgentRoutes = (server: FastifyInstance) => {
  server.post("/api/agent/message", async (request, reply) => {
    const authed = await ensureAuth(request, reply);
    if (!authed) return;
    const parseResult = agentMessageSchema.safeParse(request.body);
    if (!parseResult.success) {
      reply.code(400).send({ error: parseResult.error.flatten() });
      return;
    }
    const payload = parseResult.data;
    const response = await orchestrateAgentMessage(payload);

    if (response.toolCalls && response.toolCalls.length > 0) {
      const results = [];
      for (const call of response.toolCalls) {
        const outcome = await executeTool(call.name, call.arguments);
        results.push({ tool: call.name, result: outcome });
      }
      reply.send({ reply: response.reply, tools: results });
      return;
    }
    reply.send(response);
  });
};
