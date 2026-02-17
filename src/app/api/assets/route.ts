import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getPrismaClient } from "@/lib/db";
import { toErrorResponse } from "@/lib/http";

const createAssetJsonSchema = z.object({
  userId: z.string().min(1),
  workspaceId: z.string().min(1),
  title: z.string().min(1),
  userDescription: z.string().default(""),
  categoryId: z.string().min(1),
  tags: z.array(z.string()).default([]),
  filePath: z.string().min(1),
  fileType: z.string().min(1),
  fileSize: z.number().int().positive()
});

const createAssetFormSchema = z.object({
  userId: z.string().min(1),
  workspaceId: z.string().min(1),
  title: z.string().min(1),
  userDescription: z.string().default(""),
  categoryId: z.string().min(1),
  tags: z.array(z.string()).default([])
});

export async function GET(request: NextRequest) {
  try {
    const userId = request.nextUrl.searchParams.get("userId");
    const categoryId = request.nextUrl.searchParams.get("categoryId");
    const query = request.nextUrl.searchParams.get("q");

    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    const prisma = await getPrismaClient();
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

async function createAssetFromFormData(request: NextRequest) {
  const form = await request.formData();
  const file = form.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "An image file is required" }, { status: 400 });
  }

  const payload = createAssetFormSchema.parse({
    userId: String(form.get("userId") ?? ""),
    workspaceId: String(form.get("workspaceId") ?? ""),
    title: String(form.get("title") ?? ""),
    userDescription: String(form.get("userDescription") ?? ""),
    categoryId: String(form.get("categoryId") ?? ""),
    tags: String(form.get("tags") ?? "")
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean)
  });

  const uploadsDir = path.join(process.cwd(), "uploads", payload.userId);
  await mkdir(uploadsDir, { recursive: true });

  const timestamp = Date.now();
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const fileName = `${timestamp}-${safeName}`;
  const diskPath = path.join(uploadsDir, fileName);
  const relativePath = path.join("uploads", payload.userId, fileName).replaceAll("\\", "/");

  const fileBuffer = Buffer.from(await file.arrayBuffer());
  await writeFile(diskPath, fileBuffer);

  const prisma = await getPrismaClient();
  const asset = await prisma.asset.create({
    data: {
      userId: payload.userId,
      workspaceId: payload.workspaceId,
      title: payload.title,
      userDescription: payload.userDescription,
      categoryId: payload.categoryId,
      tags: payload.tags,
      filePath: relativePath,
      fileType: file.type || "application/octet-stream",
      fileSize: file.size,
      analysisStatus: "pending"
    }
  });

  return NextResponse.json({ data: asset }, { status: 201 });
}

export async function POST(request: NextRequest) {
  try {
    const contentType = request.headers.get("content-type") ?? "";

    if (contentType.includes("multipart/form-data")) {
      return await createAssetFromFormData(request);
    }

    const payload = createAssetJsonSchema.parse(await request.json());

    const prisma = await getPrismaClient();
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
        analysisStatus: "pending"
      }
    });

    return NextResponse.json({ data: asset }, { status: 201 });
  } catch (error) {
    return toErrorResponse(error);
  }
}
