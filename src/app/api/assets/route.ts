import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { toErrorResponse } from "@/lib/http";

const createAssetSchema = z.object({
  userId: z.string().min(1),
  workspaceId: z.string().min(1),
  title: z.string().min(1),
  userDescription: z.string().default(""),
  categoryId: z.string().min(1),
  tags: z.array(z.string()).default([]),
  filePath: z.string().min(1),
  fileType: z.string().min(1),
  fileSize: z.number().int().positive(),
  thumbnailPath: z.string().min(1).optional()
});

export async function GET(request: NextRequest) {
  try {
    const userId = request.nextUrl.searchParams.get("userId");
    const categoryId = request.nextUrl.searchParams.get("categoryId");
    const query = request.nextUrl.searchParams.get("q");

    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    const assets = await prisma.asset.findMany({
      where: {
        userId,
        isArchived: false,
        ...(categoryId ? { categoryId } : {}),
        ...(query
          ? {
              OR: [
                { title: { contains: query, mode: "insensitive" } },
                { userDescription: { contains: query, mode: "insensitive" } },
                { aiDescription: { contains: query, mode: "insensitive" } }
              ]
            }
          : {})
      },
      include: {
        category: {
          select: { id: true, name: true }
        }
      },
      orderBy: { createdAt: "desc" },
      take: 100
    });

    return NextResponse.json({ data: assets });
  } catch (error) {
    return toErrorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const payload = createAssetSchema.parse(await request.json());

    const asset = await prisma.asset.create({
      data: {
        userId: payload.userId,
        workspaceId: payload.workspaceId,
        title: payload.title,
        userDescription: payload.userDescription,
        categoryId: payload.categoryId,
        tags: payload.tags,
        filePath: payload.filePath,
        fileType: payload.fileType,
        fileSize: payload.fileSize,
        thumbnailPath: payload.thumbnailPath,
        analysisStatus: "pending"
      }
    });

    return NextResponse.json({ data: asset }, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
