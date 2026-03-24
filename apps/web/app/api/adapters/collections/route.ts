import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { CollectionService } from "../../core/services/collection.service";
import { AppError } from "../../core/domain/errors";
import { PrismaCollectionRepository } from "../../db/collection.repository";
import { getSession } from "@/lib/auth";

const createSchema = z.object({
  name: z.string().min(1),
  description: z.string().min(1),
  imageUrl: z.string().url().nullish(),
  stocks: z.number().int().positive(),
  price: z.number().positive(),
  closeDate: z.string().datetime().nullish(),
});

export async function GET(request: NextRequest) {
  const session = await getSession(request);
  const { searchParams } = new URL(request.url);
  const service = new CollectionService(new PrismaCollectionRepository());
  const result = await service.list({
    userId: searchParams.get("userId") ?? undefined,
    excludeUserId: searchParams.get("excludeUserId") ?? undefined,
    excludeCompleted: searchParams.get("excludeCompleted") === "true",
    search: searchParams.get("search") ?? undefined,
    cursor: searchParams.get("cursor") ?? undefined,
    limit: Math.min(Number(searchParams.get("limit") ?? "20"), 100),
    viewerUserId: session?.userId,
  });
  return NextResponse.json(result);
}

export async function POST(request: NextRequest) {
  const session = await getSession(request);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const service = new CollectionService(new PrismaCollectionRepository());
    const { closeDate, ...rest } = parsed.data;
    const collection = await service.create({ ...rest, closeDate: closeDate ? new Date(closeDate) : null }, session.userId);
    return NextResponse.json(collection, { status: 201 });
  } catch (err) {
    if (err instanceof AppError) return NextResponse.json({ error: err.message }, { status: err.statusCode });
    throw err;
  }
}
