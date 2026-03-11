import { PrismaClient } from "@prisma/client";
import path from "node:path";

const prisma = new PrismaClient();

const rand = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
const pick = <T>(arr: T[]) => arr[rand(0, arr.length - 1)];
const daysAgo = (d: number) => new Date(Date.now() - d * 24 * 60 * 60 * 1000);

const categories = [
  "ecommerce",
  "travel",
  "food_delivery",
  "subscription",
  "wallet",
  "upi",
  "card"
];

const merchantNames = [
  "SkyRoute Air",
  "QuickKart",
  "UrbanStay",
  "MetroMeals",
  "RideNow",
  "StreamPlus",
  "MegaMart",
  "CloudDesk",
  "HealthHub",
  "StudyPro"
];

const actionTypes = [
  "CASE_CREATED",
  "EVIDENCE_UPLOADED",
  "AGENT_REVIEW",
  "MERCHANT_FOLLOWUP",
  "ESCALATION_SENT",
  "RESOLUTION_CONFIRMED"
];

const commChannels = ["EMAIL", "SMS", "WHATSAPP"] as const;

async function main() {
  console.log("Seeding big-size demo data...");

  await prisma.auditLog.deleteMany();
  await prisma.slaTimer.deleteMany();
  await prisma.routingRule.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.outcome.deleteMany();
  await prisma.communication.deleteMany();
  await prisma.action.deleteMany();
  await prisma.evidence.deleteMany();
  await prisma.case.deleteMany();
  await prisma.agent.deleteMany();
  await prisma.merchant.deleteMany();
  await prisma.user.deleteMany();

  const consumerUsers = [] as { id: string }[];
  const agentUsers = [] as { id: string }[];
  const merchantAdmins = [] as { id: string }[];

  for (let i = 1; i <= 200; i++) {
    const user = await prisma.user.create({
      data: {
        email: `consumer${i}@demo.local`,
        phone: `90000${i.toString().padStart(5, "0")}`,
        name: `Consumer ${i}`,
        role: "CONSUMER"
      }
    });
    consumerUsers.push(user);
  }

  for (let i = 1; i <= 25; i++) {
    const user = await prisma.user.create({
      data: {
        email: `agent${i}@demo.local`,
        phone: `80000${i.toString().padStart(5, "0")}`,
        name: `Agent ${i}`,
        role: "AGENT"
      }
    });
    agentUsers.push(user);
    await prisma.agent.create({
      data: { userId: user.id, team: i % 2 === 0 ? "Tier-1" : "Tier-2" }
    });
  }

  for (let i = 1; i <= 40; i++) {
    const user = await prisma.user.create({
      data: {
        email: `merchant${i}@demo.local`,
        name: `Merchant Admin ${i}`,
        role: "MERCHANT_ADMIN"
      }
    });
    merchantAdmins.push(user);
  }

  const merchants = [] as { id: string }[];
  for (let i = 1; i <= 100; i++) {
    const name = `${pick(merchantNames)} ${i}`;
    const merchant = await prisma.merchant.create({
      data: {
        name,
        category: pick(categories),
        contactEmail: `support${i}@merchant.local`
      }
    });
    merchants.push(merchant);
  }

  for (let i = 1; i <= 80; i++) {
    await prisma.routingRule.create({
      data: {
        name: `Rule ${i}`,
        category: pick(categories),
        priority: i % 5 === 0 ? "HIGH" : "NORMAL",
        team: i % 2 === 0 ? "Tier-1" : "Tier-2",
        active: i % 7 !== 0
      }
    });
  }

  const imageBase = path.resolve("E:/Codex-Idea/demo-assets/images");
  const imageCount = 300;

  const statusPool = [
    "NEW",
    "EVIDENCE_PENDING",
    "ROUTED",
    "IN_PROGRESS",
    "ESCALATED",
    "RESOLVED",
    "CLOSED"
  ] as const;

  for (let i = 1; i <= 1200; i++) {
    const user = pick(consumerUsers);
    const merchant = pick(merchants);
    const status = pick(statusPool);
    const amount = rand(200, 45000);

    const created = await prisma.case.create({
      data: {
        userId: user.id,
        merchantId: merchant.id,
        category: pick(categories),
        amount,
        currency: "INR",
        priority: amount > 20000 ? "HIGH" : "NORMAL",
        description: `Refund pending for order ${i}`,
        status
      }
    });

    await prisma.slaTimer.create({
      data: {
        caseId: created.id,
        dueAt: daysAgo(rand(0, 3))
      }
    });

    const evidenceCount = rand(1, 3);
    for (let e = 0; e < evidenceCount; e++) {
      const imgId = rand(1, imageCount).toString().padStart(4, "0");
      await prisma.evidence.create({
        data: {
          caseId: created.id,
          uploaderId: user.id,
          type: "receipt",
          storageUrl: `file:///${imageBase}/evidence_${imgId}.svg`,
          hashSha256: `demo_hash_${created.id}_${e}`,
          metadata: { source: "demo" }
        }
      });
    }

    const actionCount = rand(2, 5);
    for (let a = 0; a < actionCount; a++) {
      await prisma.action.create({
        data: {
          caseId: created.id,
          actorId: pick(agentUsers).id,
          type: pick(actionTypes),
          notes: `Auto action ${a + 1}`
        }
      });
    }

    const commCount = rand(1, 3);
    for (let c = 0; c < commCount; c++) {
      await prisma.communication.create({
        data: {
          caseId: created.id,
          channel: pick(commChannels),
          toAddress: user.email,
          templateId: `tmpl_${rand(1, 5)}`,
          status: "SENT",
          providerMsg: `msg_${created.id}_${c}`
        }
      });
    }

    if (status === "RESOLVED" || status === "CLOSED") {
      await prisma.outcome.create({
        data: {
          caseId: created.id,
          type: rand(0, 4) === 0 ? "PARTIAL_REFUND" : "FULL_REFUND",
          refundAmount: rand(100, amount),
          refundDate: daysAgo(rand(1, 30)),
          verificationStatus: "VERIFIED"
        }
      });
    }

    if (rand(0, 1) === 1) {
      await prisma.payment.create({
        data: {
          caseId: created.id,
          userId: user.id,
          amount: Math.round(amount * 0.1),
          currency: "INR",
          type: "SUCCESS_FEE",
          status: rand(0, 3) === 0 ? "FAILED" : "PAID",
          provider: "DEMO",
          providerRef: `pay_${created.id}`
        }
      });
    }

    await prisma.auditLog.create({
      data: {
        actorId: pick(agentUsers).id,
        entityType: "case",
        entityId: created.id,
        action: "CASE_UPDATED",
        payload: { status: created.status }
      }
    });
  }

  console.log("Seed complete.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
