import { jwtVerify } from "jose";
import { FastifyReply, FastifyRequest } from "fastify";

const secret = process.env.AI_ENGINE_JWT_SECRET || "dev-secret";

export interface AuthContext {
  sub?: string;
  hotelId?: string;
  scope?: string[];
}

export const ensureAuth = async (request: FastifyRequest, reply: FastifyReply) => {
  const header = request.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    reply.code(401).send({ message: "Unauthorized" });
    return false;
  }
  const token = header.slice("Bearer ".length);
  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(secret));
    (request as FastifyRequest & { auth?: AuthContext }).auth = payload as AuthContext;
    return true;
  } catch (err) {
    request.log.warn({ err }, "Auth verification failed");
    reply.code(401).send({ message: "Unauthorized" });
    return false;
  }
};
