import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { BidService } from "../../core/services/bid.service";
import { AppError } from "../../core/domain/errors";
import { PrismaBidRepository } from "../../db/bid.repository";
import { PrismaCollectionRepository } from "../../db/collection.repository";
import { getSession } from "@/lib/auth";

const createSchema = z.object({
  collectionId: z.string().min(1),
  price: z.number().positive(),
});

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const service = new BidService(new PrismaBidRepository(), new PrismaCollectionRepository());
  const result = await service.list({
    collectionId: searchParams.get("collectionId") ?? undefined,
    userId: searchParams.get("userId") ?? undefined,
    page: Math.max(1, Number(searchParams.get("page") ?? "1")),
    limit: Math.min(Number(searchParams.get("limit") ?? "10"), 100),
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
    const service = new BidService(new PrismaBidRepository(), new PrismaCollectionRepository());
    const bid = await service.create(parsed.data, session.userId);
    return NextResponse.json(bid, { status: 201 });
  } catch (err) {
    if (err instanceof AppError) return NextResponse.json({ error: err.message }, { status: err.statusCode });
    throw err;
  }
}
