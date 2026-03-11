import { z } from "zod";

export const caseStatus = z.enum([
  "NEW",
  "EVIDENCE_PENDING",
  "ROUTED",
  "IN_PROGRESS",
  "ESCALATED",
  "RESOLVED",
  "CLOSED"
]);

export type CaseStatus = z.infer<typeof caseStatus>;
