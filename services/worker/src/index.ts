import { Queue, Worker } from "bullmq";
import IORedis from "ioredis";
import pino from "pino";

const logger = pino();
const connection = new IORedis(process.env.REDIS_URL ?? "redis://localhost:6379");

export const escalationQueue = new Queue("escalations", { connection });

new Worker(
  "escalations",
  async (job) => {
    logger.info({ jobId: job.id, data: job.data }, "Processing escalation job");
  },
  { connection }
);

logger.info("Worker started");
