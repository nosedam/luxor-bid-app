import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { BidService } from "../../../core/services/bid.service";
import { AppError } from "../../../core/domain/errors";
import { PrismaBidRepository } from "../../../db/bid.repository";
import { PrismaCollectionRepository } from "../../../db/collection.repository";
import { getSession } from "@/lib/auth";

const updateSchema = z.object({
  price: z.number().positive(),
});

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession(request);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const body = await request.json();
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  try {
    const service = new BidService(new PrismaBidRepository(), new PrismaCollectionRepository());
    const bid = await service.update(id, parsed.data.price, session.userId);
    return NextResponse.json(bid);
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
    const service = new BidService(new PrismaBidRepository(), new PrismaCollectionRepository());
    await service.delete(id, session.userId);
    return NextResponse.json({ success: true });
  } catch (err) {
    if (err instanceof AppError) return NextResponse.json({ error: err.message }, { status: err.statusCode });
    throw err;
  }
}
