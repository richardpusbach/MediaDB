import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { DatabaseClientUnavailableError } from "@/lib/db";

type PrismaLikeError = {
  code?: string;
  name?: string;
};

function readPrismaCode(error: unknown): string | null {
  if (!error || typeof error !== "object") return null;
  const maybe = error as PrismaLikeError;
  return typeof maybe.code === "string" ? maybe.code : null;
}

export function toErrorResponse(error: unknown) {
  if (error instanceof ZodError) {
    return NextResponse.json(
      { error: "Validation failed", details: error.flatten() },
      { status: 400 }
    );
  }

  if (error instanceof DatabaseClientUnavailableError) {
    return NextResponse.json({ error: error.message }, { status: 503 });
  }

  const prismaCode = readPrismaCode(error);

  if (prismaCode === "P2002") {
    return NextResponse.json({ error: "Record already exists" }, { status: 409 });
  }

  if (prismaCode === "P2003") {
    return NextResponse.json(
      { error: "Referenced record is missing. Seed demo records first." },
      { status: 400 }
    );
  }

  if (prismaCode === "P2025") {
    return NextResponse.json({ error: "Record not found" }, { status: 404 });
  }

  console.error(error);
  return NextResponse.json({ error: "Unexpected server error" }, { status: 500 });
}
