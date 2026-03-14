import dotenv from "dotenv";
import { PrismaClient } from "../prisma/generated/client";

dotenv.config({ path: "../../apps/server/.env" });

const PUBLIC_TEAM_ID = "team_public_openbeam";
const PUBLIC_TEAM_SLUG = "openbeam-public";
const PUBLIC_WORKSPACE_ID = "ws_public_openbeam";
const SYSTEM_USER_ID = "user_system_openbeam";

const prisma = new PrismaClient();

const PUBLIC_CONNECTORS = [
  {
    id: "conn_public_cisa_kev",
    app: "CISA_KEV" as const,
    name: "CISA Known Exploited Vulnerabilities",
    config: {},
  },
  {
    id: "conn_public_owasp",
    app: "OWASP" as const,
    name: "OWASP Security Guides",
    config: { projects: "top10,cheatSheets,asvs,wstg" },
  },
  {
    id: "conn_public_mitre_attack",
    app: "MITRE_ATTACK" as const,
    name: "MITRE ATT&CK Framework",
    config: { domains: "enterprise,mobile,ics" },
  },
  {
    id: "conn_public_nvd",
    app: "NVD" as const,
    name: "National Vulnerability Database",
    config: {},
  },
] as const;

async function seed() {
  console.log("Seeding public datasets...\n");

  const systemUser = await prisma.user.upsert({
    where: { id: SYSTEM_USER_ID },
    create: {
      id: SYSTEM_USER_ID,
      name: "OpenBeam System",
      email: "vineeth@openbeam.work",
      emailVerified: true,
    },
    update: {},
  });
  console.log(`  User: ${systemUser.id} (${systemUser.email})`);

  const team = await prisma.team.upsert({
    where: { id: PUBLIC_TEAM_ID },
    create: {
      id: PUBLIC_TEAM_ID,
      name: "OpenBeam Public",
      slug: PUBLIC_TEAM_SLUG,
    },
    update: {},
  });
  console.log(`  Team: ${team.id} (${team.slug})`);

  const membership = await prisma.usersOnTeam.upsert({
    where: {
      userId_teamId: { userId: SYSTEM_USER_ID, teamId: PUBLIC_TEAM_ID },
    },
    create: {
      userId: SYSTEM_USER_ID,
      teamId: PUBLIC_TEAM_ID,
      role: "OWNER",
    },
    update: {},
  });
  console.log(`  Membership: ${membership.userId} → ${membership.teamId}`);

  const workspace = await prisma.workspace.upsert({
    where: { externalId: PUBLIC_WORKSPACE_ID },
    create: {
      externalId: PUBLIC_WORKSPACE_ID,
      teamId: PUBLIC_TEAM_ID,
      name: "Public Datasets",
    },
    update: {},
  });
  console.log(`  Workspace: ${workspace.externalId}\n`);

  for (const def of PUBLIC_CONNECTORS) {
    const connector = await prisma.connector.upsert({
      where: { id: def.id },
      create: {
        id: def.id,
        teamId: PUBLIC_TEAM_ID,
        userId: SYSTEM_USER_ID,
        workspaceExternalId: PUBLIC_WORKSPACE_ID,
        name: def.name,
        type: "SOURCE",
        authType: "PUBLIC_DATASET",
        app: def.app,
        status: "ACTIVE",
        config: def.config,
        syncEnabled: true,
        syncMode: "incremental",
      },
      update: {
        status: "ACTIVE",
        syncEnabled: true,
      },
    });

    const fullJobExists = await prisma.syncJob.findFirst({
      where: { connectorId: connector.id, type: "FULL" },
    });

    if (!fullJobExists) {
      await prisma.syncJob.create({
        data: {
          connectorId: connector.id,
          type: "FULL",
          trigger: "SCHEDULED",
          status: "PENDING",
          priority: 3,
        },
      });
    }

    console.log(`  Connector: ${connector.app} → ${connector.id}`);
  }

  console.log("\nSeed complete.");
}

seed()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error("Seed failed:", e);
    prisma.$disconnect();
    process.exit(1);
  });
