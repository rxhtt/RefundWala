import Fastify from "fastify";
import cors from "@fastify/cors";
import jwt from "@fastify/jwt";
import rateLimit from "@fastify/rate-limit";
import sensible from "@fastify/sensible";
import { z } from "zod";
import { PrismaClient } from "@prisma/client";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const server = Fastify({ logger: true });
const prisma = new PrismaClient();

await server.register(cors, { origin: true });
await server.register(sensible);
await server.register(rateLimit, { max: 100, timeWindow: "1 minute" });
await server.register(jwt, { secret: process.env.JWT_SECRET ?? "dev-secret" });

async function auditLog(action: string, entityType: string, entityId: string, payload?: unknown) {
  await prisma.auditLog.create({
    data: {
      action,
      entityType,
      entityId,
      payload: payload as any
    }
  });
}

server.get("/health", async () => ({ status: "ok" }));

const createCaseSchema = z.object({
  merchant_id: z.string().min(1).optional(),
  merchant_name: z.string().min(2).optional(),
  category: z.string().min(1),
  amount: z.number().positive(),
  currency: z.string().min(1),
  description: z.string().min(5)
});

server.post("/cases", async (request, reply) => {
  const parse = createCaseSchema.safeParse(request.body);
  if (!parse.success) {
    return reply.badRequest("Invalid payload", { issues: parse.error.issues });
  }

  const input = parse.data;
  const user =
    (await prisma.user.findFirst({ where: { email: "demo-consumer@local" } })) ??
    (await prisma.user.create({
      data: { email: "demo-consumer@local", role: "CONSUMER", name: "Demo User" }
    }));

  const merchant =
    input.merchant_id
      ? await prisma.merchant.findUnique({ where: { id: input.merchant_id } })
      : input.merchant_name
        ? await prisma.merchant.create({ data: { name: input.merchant_name } })
        : null;

  const created = await prisma.case.create({
    data: {
      userId: user.id,
      merchantId: merchant?.id,
      category: input.category,
      amount: Math.round(input.amount),
      currency: input.currency,
      description: input.description,
      status: "NEW"
    }
  });

  await prisma.action.create({
    data: {
      caseId: created.id,
      actorId: user.id,
      type: "CASE_CREATED",
      notes: "Case submitted via API"
    }
  });

  await auditLog("CASE_CREATED", "case", created.id, { status: created.status });

  return reply.code(201).send({ id: created.id, status: created.status });
});

server.get("/cases/:id", async (request, reply) => {
  const id = (request.params as { id: string }).id;
  const found = await prisma.case.findUnique({
    where: { id },
    include: { evidence: true, actions: true, comms: true, outcome: true, payments: true }
  });
  if (!found) return reply.notFound("Case not found");
  return found;
});

server.get("/cases", async (request) => {
  const { limit = "50", status } = request.query as { limit?: string; status?: string };
  return prisma.case.findMany({
    where: status ? { status: status as any } : undefined,
    orderBy: { createdAt: "desc" },
    take: Math.min(Number(limit), 200),
    include: { evidence: true, outcome: true, payments: true }
  });
});

const evidenceSchema = z.object({
  type: z.string().min(1),
  storage_url: z.string().min(5),
  hash_sha256: z.string().min(10),
  metadata: z.record(z.any()).optional()
});

server.post("/cases/:id/evidence", async (request, reply) => {
  const id = (request.params as { id: string }).id;
  const parse = evidenceSchema.safeParse(request.body);
  if (!parse.success) {
    return reply.badRequest("Invalid payload", { issues: parse.error.issues });
  }

  const user =
    (await prisma.user.findFirst({ where: { email: "demo-consumer@local" } })) ??
    (await prisma.user.create({
      data: { email: "demo-consumer@local", role: "CONSUMER", name: "Demo User" }
    }));

  const evidence = await prisma.evidence.create({
    data: {
      caseId: id,
      uploaderId: user.id,
      type: parse.data.type,
      storageUrl: parse.data.storage_url,
      hashSha256: parse.data.hash_sha256,
      metadata: parse.data.metadata ?? undefined
    }
  });

  await prisma.action.create({
    data: {
      caseId: id,
      actorId: user.id,
      type: "EVIDENCE_UPLOADED",
      notes: parse.data.type
    }
  });

  await auditLog("EVIDENCE_UPLOADED", "evidence", evidence.id, { caseId: id });

  return reply.code(201).send(evidence);
});

server.get("/evidence", async (request) => {
  const { limit = "50" } = request.query as { limit?: string };
  return prisma.evidence.findMany({
    orderBy: { createdAt: "desc" },
    take: Math.min(Number(limit), 200)
  });
});

server.get("/evidence/:id/file", async (request, reply) => {
  const id = (request.params as { id: string }).id;
  const evidence = await prisma.evidence.findUnique({ where: { id } });
  if (!evidence) return reply.notFound("Evidence not found");

  const storageUrl = evidence.storageUrl;
  if (!storageUrl.startsWith("file:///")) {
    return reply.badRequest("Only local file demo evidence supported");
  }

  const filePath = fileURLToPath(storageUrl);
  const allowedBase = path.resolve("E:/Codex-Idea/demo-assets/images");
  const resolved = path.resolve(filePath);
  if (!resolved.startsWith(allowedBase)) {
    return reply.forbidden("Access denied");
  }

  try {
    const data = await fs.readFile(resolved);
    reply.header("Content-Type", "image/svg+xml");
    return reply.send(data);
  } catch {
    return reply.notFound("File not found");
  }
});

const actionSchema = z.object({
  action_type: z.string().min(1),
  notes: z.string().optional()
});

server.post("/cases/:id/actions", async (request, reply) => {
  const id = (request.params as { id: string }).id;
  const parse = actionSchema.safeParse(request.body);
  if (!parse.success) {
    return reply.badRequest("Invalid payload", { issues: parse.error.issues });
  }

  const agent =
    (await prisma.user.findFirst({ where: { email: "demo-agent@local" } })) ??
    (await prisma.user.create({
      data: { email: "demo-agent@local", role: "AGENT", name: "Demo Agent" }
    }));

  const action = await prisma.action.create({
    data: {
      caseId: id,
      actorId: agent.id,
      type: parse.data.action_type,
      notes: parse.data.notes
    }
  });

  await auditLog("ACTION_CREATED", "action", action.id, { caseId: id });

  return reply.code(201).send(action);
});

const paymentIntentSchema = z.object({
  case_id: z.string().min(1),
  amount: z.number().positive(),
  currency: z.string().min(1),
  type: z.enum(["SUCCESS_FEE", "SUBSCRIPTION"])
});

server.post("/payments/intent", async (request, reply) => {
  const parse = paymentIntentSchema.safeParse(request.body);
  if (!parse.success) {
    return reply.badRequest("Invalid payload", { issues: parse.error.issues });
  }

  const user =
    (await prisma.user.findFirst({ where: { email: "demo-consumer@local" } })) ??
    (await prisma.user.create({
      data: { email: "demo-consumer@local", role: "CONSUMER", name: "Demo User" }
    }));

  const payment = await prisma.payment.create({
    data: {
      caseId: parse.data.case_id,
      userId: user.id,
      amount: Math.round(parse.data.amount),
      currency: parse.data.currency,
      type: parse.data.type,
      status: "PENDING",
      provider: "DEMO",
      providerRef: `demo_${Date.now()}`
    }
  });

  await auditLog("PAYMENT_INTENT_CREATED", "payment", payment.id, { caseId: parse.data.case_id });

  return reply.code(201).send({ payment_id: payment.id, client_secret: "demo" });
});

const paymentWebhookSchema = z.object({
  payment_id: z.string().min(1),
  status: z.enum(["PAID", "FAILED"])
});

server.post("/webhooks/payment", async (request, reply) => {
  const parse = paymentWebhookSchema.safeParse(request.body);
  if (!parse.success) {
    return reply.badRequest("Invalid payload", { issues: parse.error.issues });
  }

  const payment = await prisma.payment.update({
    where: { id: parse.data.payment_id },
    data: { status: parse.data.status }
  });

  await auditLog("PAYMENT_STATUS_UPDATED", "payment", payment.id, { status: payment.status });

  return reply.code(200).send({ id: payment.id, status: payment.status });
});

server.get("/merchant/cases", async (request) => {
  const { merchant_id, status } = request.query as { merchant_id?: string; status?: string };
  if (!merchant_id) return [];
  return prisma.case.findMany({
    where: {
      merchantId: merchant_id,
      status: status as any
    },
    orderBy: { createdAt: "desc" }
  });
});

server.get("/payments", async (request) => {
  const { limit = "50" } = request.query as { limit?: string };
  return prisma.payment.findMany({
    orderBy: { createdAt: "desc" },
    take: Math.min(Number(limit), 200)
  });
});

server.get("/communications", async (request) => {
  const { limit = "50" } = request.query as { limit?: string };
  return prisma.communication.findMany({
    orderBy: { createdAt: "desc" },
    take: Math.min(Number(limit), 200)
  });
});

server.get("/outcomes", async (request) => {
  const { limit = "50" } = request.query as { limit?: string };
  return prisma.outcome.findMany({
    orderBy: { createdAt: "desc" },
    take: Math.min(Number(limit), 200)
  });
});

server.get("/merchants", async (request) => {
  const { limit = "50" } = request.query as { limit?: string };
  return prisma.merchant.findMany({
    orderBy: { createdAt: "desc" },
    take: Math.min(Number(limit), 200)
  });
});

server.get("/users", async (request) => {
  const { limit = "50", role } = request.query as { limit?: string; role?: string };
  return prisma.user.findMany({
    where: role ? { role: role as any } : undefined,
    orderBy: { createdAt: "desc" },
    take: Math.min(Number(limit), 200)
  });
});

server.get("/sla-timers", async (request) => {
  const { limit = "50" } = request.query as { limit?: string };
  return prisma.slaTimer.findMany({
    orderBy: { createdAt: "desc" },
    take: Math.min(Number(limit), 200),
    include: { case: true }
  });
});

const routingRuleSchema = z.object({
  name: z.string().min(2),
  category: z.string().min(1),
  priority: z.string().min(1).optional(),
  team: z.string().min(1),
  active: z.boolean().optional()
});

server.post("/routing/rules", async (request, reply) => {
  const parse = routingRuleSchema.safeParse(request.body);
  if (!parse.success) {
    return reply.badRequest("Invalid payload", { issues: parse.error.issues });
  }
  const rule = await prisma.routingRule.create({
    data: {
      name: parse.data.name,
      category: parse.data.category,
      priority: parse.data.priority ?? "NORMAL",
      team: parse.data.team,
      active: parse.data.active ?? true
    }
  });
  await auditLog("ROUTING_RULE_CREATED", "routing_rule", rule.id);
  return reply.code(201).send(rule);
});

server.get("/routing/rules", async () => {
  return prisma.routingRule.findMany({ orderBy: { createdAt: "desc" } });
});

const slaSchema = z.object({
  due_at: z.string().datetime()
});

server.post("/cases/:id/sla", async (request, reply) => {
  const id = (request.params as { id: string }).id;
  const parse = slaSchema.safeParse(request.body);
  if (!parse.success) {
    return reply.badRequest("Invalid payload", { issues: parse.error.issues });
  }
  const timer = await prisma.slaTimer.create({
    data: {
      caseId: id,
      dueAt: new Date(parse.data.due_at)
    }
  });
  await auditLog("SLA_TIMER_CREATED", "sla_timer", timer.id, { caseId: id });
  return reply.code(201).send(timer);
});

server.post("/merchant/cases/:id/resolve", async (request, reply) => {
  const id = (request.params as { id: string }).id;
  const outcomeSchema = z.object({
    type: z.enum(["FULL_REFUND", "PARTIAL_REFUND", "REJECTED", "WITHDRAWN"]),
    refund_amount: z.number().nonnegative().optional(),
    refund_date: z.string().datetime().optional()
  });
  const parse = outcomeSchema.safeParse(request.body);
  if (!parse.success) {
    return reply.badRequest("Invalid payload", { issues: parse.error.issues });
  }

  const outcome = await prisma.outcome.upsert({
    where: { caseId: id },
    update: {
      type: parse.data.type,
      refundAmount: parse.data.refund_amount ? Math.round(parse.data.refund_amount) : null,
      refundDate: parse.data.refund_date ? new Date(parse.data.refund_date) : null,
      verificationStatus: "UNVERIFIED"
    },
    create: {
      caseId: id,
      type: parse.data.type,
      refundAmount: parse.data.refund_amount ? Math.round(parse.data.refund_amount) : null,
      refundDate: parse.data.refund_date ? new Date(parse.data.refund_date) : null,
      verificationStatus: "UNVERIFIED"
    }
  });

  const updated = await prisma.case.update({
    where: { id },
    data: { status: "RESOLVED" }
  });

  await auditLog("CASE_RESOLVED", "case", id, { outcomeId: outcome.id });
  return reply.code(200).send({ case: updated, outcome });
});

server.get("/analytics/summary", async () => {
  const total = await prisma.case.count();
  const resolved = await prisma.case.count({ where: { status: "RESOLVED" } });
  const escalated = await prisma.case.count({ where: { status: "ESCALATED" } });
  return {
    total_cases: total,
    resolved_cases: resolved,
    escalated_cases: escalated
  };
});

server.get("/audit/logs", async () => {
  return prisma.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 50 });
});

const port = Number(process.env.PORT ?? 4000);
const host = process.env.HOST ?? "0.0.0.0";

try {
  await server.listen({ port, host });
} catch (err) {
  server.log.error(err);
  process.exit(1);
}
