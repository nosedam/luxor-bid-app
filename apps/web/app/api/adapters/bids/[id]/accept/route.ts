import { NextRequest, NextResponse } from "next/server";
import { BidService } from "../../../../core/services/bid.service";
import { AppError } from "../../../../core/domain/errors";
import { PrismaBidRepository } from "../../../../db/bid.repository";
import { PrismaCollectionRepository } from "../../../../db/collection.repository";
import { getSession } from "@/lib/auth";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession(request);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;

  try {
    const service = new BidService(new PrismaBidRepository(), new PrismaCollectionRepository());
    const bid = await service.accept(id, session.userId);
    return NextResponse.json(bid);
  } catch (err) {
    if (err instanceof AppError) return NextResponse.json({ error: err.message }, { status: err.statusCode });
    throw err;
  }
}
