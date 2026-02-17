import type { PrismaClient } from "@prisma/client";

export class DatabaseClientUnavailableError extends Error {
  constructor(message = "Database client is unavailable") {
    super(message);
    this.name = "DatabaseClientUnavailableError";
  }
}

type GlobalForPrisma = typeof globalThis & {
  prisma?: PrismaClient;
};

const globalForPrisma = globalThis as GlobalForPrisma;

export async function getPrismaClient(): Promise<PrismaClient> {
  if (globalForPrisma.prisma) {
    return globalForPrisma.prisma;
  }

  try {
    const { PrismaClient: PrismaClientCtor } = await import("@prisma/client");
    const client = new PrismaClientCtor({ log: ["warn", "error"] });

    if (process.env.NODE_ENV !== "production") {
      globalForPrisma.prisma = client;
    }

    return client;
  } catch (error) {
    throw new DatabaseClientUnavailableError(
      "Prisma client could not be loaded. Run npm install and npm run db:generate."
    );
  }
}
