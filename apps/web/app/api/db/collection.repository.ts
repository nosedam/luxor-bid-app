import { prisma } from "@workspace/db";
import type { ICollectionRepository, ListCollectionsOptions } from "../core/ports/collection.repository";
import type { Collection, CollectionWithRelations } from "../core/domain/collection";

const withRelations = {
  user: { select: { id: true, name: true } },
  _count: { select: { bids: { where: { deletedAt: null } } } },
  bids: { where: { deletedAt: null }, select: { price: true }, orderBy: { price: "desc" as const }, take: 1 },
} as const;

export class PrismaCollectionRepository implements ICollectionRepository {
  async list({ userId, excludeUserId, excludeCompleted, search, cursor, limit, viewerUserId }: ListCollectionsOptions) {
    const where: Record<string, unknown> = { deletedAt: null };
    if (userId) where.userId = userId;
    if (excludeUserId) where.userId = { not: excludeUserId };
    if (excludeCompleted) where.status = { not: "COMPLETED" };
    if (search) where.name = { contains: search, mode: "insensitive" };

    if (cursor) {
      const sep = cursor.lastIndexOf("|");
      const createdAt = new Date(cursor.slice(0, sep));
      const cursorId = cursor.slice(sep + 1);
      where.OR = [
        { createdAt: { lt: createdAt } },
        { createdAt: createdAt, id: { lt: cursorId } },
      ];
    }

    const collections = await prisma.collection.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      take: limit + 1,
      include: withRelations,
    });

    const hasMore = collections.length > limit;
    const raw = hasMore ? collections.slice(0, limit) : collections;
    const lastItem = raw[raw.length - 1];
    const nextCursor = hasMore && lastItem
      ? `${lastItem.createdAt.toISOString()}|${lastItem.id}`
      : null;

    let myBidMap: Record<string, { id: string; price: number; status: string }> = {};
    if (viewerUserId && raw.length > 0) {
      const viewerBids = await prisma.bid.findMany({
        where: { collectionId: { in: raw.map((c) => c.id) }, userId: viewerUserId, deletedAt: null } as Record<string, unknown>,
        select: { id: true, price: true, status: true, collectionId: true },
      });
      myBidMap = Object.fromEntries(viewerBids.map((b) => [b.collectionId, { id: b.id, price: b.price, status: b.status }]));
    }

    const data = (raw as any[]).map(({ bids, ...c }: any) => ({ ...c, maxBid: bids[0]?.price ?? null, myBid: myBidMap[c.id] ?? null }));
    return { data: data as CollectionWithRelations[], nextCursor };
  }

  async findById(id: string): Promise<Collection | null> {
    return prisma.collection.findFirst({ where: { id, deletedAt: null } }) as Promise<Collection | null>;
  }

  async create(data: {
    name: string;
    description: string;
    imageUrl?: string | null;
    stocks: number;
    price: number;
    userId: string;
  }): Promise<CollectionWithRelations> {
    const { bids, ...c } = await prisma.collection.create({ data, include: withRelations }) as any;
    return { ...c, maxBid: bids[0]?.price ?? null, myBid: null } as CollectionWithRelations;
  }

  async update(
    id: string,
    data: Partial<{ name: string; description: string; imageUrl: string | null; stocks: number; price: number }>
  ): Promise<CollectionWithRelations> {
    const { bids, ...c } = await prisma.collection.update({ where: { id }, data, include: withRelations }) as any;
    return { ...c, maxBid: bids[0]?.price ?? null, myBid: null } as CollectionWithRelations;
  }

  async delete(id: string): Promise<void> {
    const now = new Date();
    await prisma.$transaction([
      prisma.bid.updateMany({ where: { collectionId: id, deletedAt: null }, data: { deletedAt: now } }),
      prisma.collection.update({ where: { id }, data: { deletedAt: now } }),
    ]);
  }
}
