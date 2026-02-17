import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getPrismaClient } from "@/lib/db";
import { toErrorResponse } from "@/lib/http";

const updateAssetSchema = z
  .object({
    title: z.string().min(1).optional(),
    userDescription: z.string().optional(),
    categoryId: z.string().min(1).optional(),
    tags: z.array(z.string()).optional(),
    isFavorite: z.boolean().optional(),
    isArchived: z.boolean().optional()
  })
  .refine((payload) => Object.keys(payload).length > 0, {
    message: "At least one field must be provided"
  });

export async function PATCH(
  request: NextRequest,
  { params }: { params: { assetId: string } }
) {
  try {
    const payload = updateAssetSchema.parse(await request.json());

    const prisma = await getPrismaClient();
    const updated = await prisma.asset.update({
      where: { id: params.assetId },
      data: payload
    });

    return NextResponse.json({ data: updated });
  } catch (error) {
    return toErrorResponse(error);
  }
}
