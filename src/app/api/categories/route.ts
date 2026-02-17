import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { toErrorResponse } from "@/lib/http";

const createCategorySchema = z.object({
  userId: z.string().min(1),
  name: z.string().min(1).max(64)
});

export async function GET(request: NextRequest) {
  try {
    const userId = request.nextUrl.searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    const categories = await prisma.category.findMany({
      where: { userId },
      orderBy: { name: "asc" }
    });

    return NextResponse.json({ data: categories });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const payload = createCategorySchema.parse(await request.json());

    const category = await prisma.category.upsert({
      where: {
        userId_name: {
          userId: payload.userId,
          name: payload.name
        }
      },
      update: {},
      create: {
        userId: payload.userId,
        name: payload.name
      }
    });

    return NextResponse.json({ data: category }, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
