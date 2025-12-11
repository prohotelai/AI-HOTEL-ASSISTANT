import { z } from "zod";
import { queryVectors } from "./pinecone";
import { embed } from "./openai";
import { Queue } from "bullmq";
import { getRedisConnection } from "../workers/jobQueue";

export interface ToolDefinition {
  name: string;
  inputSchema: z.ZodTypeAny;
  handler: (payload: Record<string, unknown>) => Promise<unknown>;
}

const redisConnection = getRedisConnection();
const createQueue = (name: string) =>
  redisConnection
    ? new Queue(name, { connection: redisConnection })
    : ({
        add: async () => ({ id: "mock" })
      } as unknown as Queue);

const ticketQueue = createQueue("tickets");

const createTicket: ToolDefinition = {
  name: "createTicket",
  inputSchema: z.object({
    subject: z.string(),
    description: z.string(),
    priority: z.enum(["low", "medium", "high"]).default("medium")
  }),
  handler: async (payload) => {
    const job = await ticketQueue.add("createTicket", payload, { removeOnComplete: true });
    return { ticketId: job.id };
  }
};

const requestService: ToolDefinition = {
  name: "requestService",
  inputSchema: z.object({
    service: z.string(),
    room: z.string().optional(),
    details: z.string().optional()
  }),
  handler: async (payload) => {
    const job = await ticketQueue.add("serviceRequest", payload, { removeOnComplete: true });
    return { status: "queued", jobId: job.id };
  }
};

const escalateToHuman: ToolDefinition = {
  name: "escalateToHuman",
  inputSchema: z.object({
    reason: z.string(),
    urgency: z.enum(["low", "medium", "high"]).default("medium")
  }),
  handler: async (payload) => {
    const job = await ticketQueue.add("escalate", payload, { removeOnComplete: true });
    return { status: "escalated", jobId: job.id };
  }
};

const getBooking: ToolDefinition = {
  name: "getBooking",
  inputSchema: z.object({
    guestId: z.string().optional(),
    confirmationNumber: z.string().optional()
  }),
  handler: async (payload) => {
    return {
      booking: {
        guestName: "Sample Guest",
        room: "1205",
        checkIn: "2025-01-01",
        checkOut: "2025-01-04",
        ...payload
      }
    };
  }
};

const checkAvailability: ToolDefinition = {
  name: "checkAvailability",
  inputSchema: z.object({
    roomType: z.string(),
    dates: z.array(z.string())
  }),
  handler: async (payload) => {
    return { available: true, payload };
  }
};

const searchKB: ToolDefinition = {
  name: "searchKB",
  inputSchema: z.object({
    hotelId: z.string(),
    query: z.string(),
    topK: z.number().int().positive().default(3)
  }),
  handler: async (payload) => {
    const vector = await embed(String(payload.query));
    const matches = await queryVectors(vector, (payload.topK as number) || 3, String(payload.hotelId));
    return matches;
  }
};

export const toolsRegistry: Record<string, ToolDefinition> = {
  [createTicket.name]: createTicket,
  [requestService.name]: requestService,
  [escalateToHuman.name]: escalateToHuman,
  [getBooking.name]: getBooking,
  [checkAvailability.name]: checkAvailability,
  [searchKB.name]: searchKB
};

export const executeTool = async (name: string, args: Record<string, unknown>) => {
  const tool = toolsRegistry[name];
  if (!tool) {
    throw new Error(`Tool ${name} is not registered`);
  }
  const parsed = tool.inputSchema.parse(args);
  return tool.handler(parsed);
};
