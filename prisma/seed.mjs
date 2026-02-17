import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  await prisma.user.upsert({
    where: { id: "demo-user" },
    update: {},
    create: {
      id: "demo-user",
      email: "demo@mediadb.local",
      displayName: "Demo User"
    }
  });

  await prisma.workspace.upsert({
    where: { id: "demo-workspace" },
    update: {},
    create: {
      id: "demo-workspace",
      name: "Demo Workspace"
    }
  });

  await prisma.workspaceMember.upsert({
    where: {
      workspaceId_userId: {
        workspaceId: "demo-workspace",
        userId: "demo-user"
      }
    },
    update: {},
    create: {
      workspaceId: "demo-workspace",
      userId: "demo-user"
    }
  });

  console.log("Seed complete: demo-user + demo-workspace created.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
