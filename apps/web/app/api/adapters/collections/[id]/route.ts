import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { CollectionService } from "../../../core/services/collection.service";
import { AppError } from "../../../core/domain/errors";
import { PrismaCollectionRepository } from "../../../db/collection.repository";
import { getSession } from "@/lib/auth";

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().min(1).optional(),
  imageUrl: z.string().url().nullable().optional(),
  stocks: z.number().int().positive().optional(),
  price: z.number().positive().optional(),
  closeDate: z.string().datetime().nullable().optional(),
});

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession(request);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await request.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const service = new CollectionService(new PrismaCollectionRepository());
    const { closeDate, ...rest } = parsed.data;
    const updateData = closeDate !== undefined
      ? { ...rest, closeDate: closeDate ? new Date(closeDate) : null }
      : rest;
    const collection = await service.update(id, updateData, session.userId);
    return NextResponse.json(collection);
  } catch (err) {
    if (err instanceof AppError) return NextResponse.json({ error: err.message }, { status: err.statusCode });
    throw err;
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession(request);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  try {
    const service = new CollectionService(new PrismaCollectionRepository());
    await service.delete(id, session.userId);
    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof AppError) return NextResponse.json({ error: err.message }, { status: err.statusCode });
    throw err;
  }
}
