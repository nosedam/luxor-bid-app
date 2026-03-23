import { prisma } from "@workspace/db";
import type { IBidRepository, ListBidsOptions } from "../core/ports/bid.repository";
import type { BidWithUser, BidWithCollection } from "../core/domain/bid";

const withUser = {
  user: { select: { id: true, name: true } },
} as const;

export class PrismaBidRepository implements IBidRepository {
  async list({ collectionId, userId, page, limit }: ListBidsOptions) {
    const where: Record<string, unknown> = { deletedAt: null };
    if (collectionId) where.collectionId = collectionId;
    if (userId) where.userId = userId;

    const [total, data] = await Promise.all([
      prisma.bid.count({ where }),
      prisma.bid.findMany({
        where,
        orderBy: { price: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        include: withUser,
      }),
    ]);

    return { data: data as BidWithUser[], total, page, totalPages: Math.ceil(total / limit) };
  }

  async findByUserAndCollection(userId: string, collectionId: string): Promise<BidWithUser | null> {
    return prisma.bid.findFirst({
      where: { userId, collectionId, deletedAt: null },
      include: withUser,
    }) as Promise<BidWithUser | null>;
  }

  async findById(id: string): Promise<BidWithCollection | null> {
    return prisma.bid.findFirst({
      where: { id, deletedAt: null },
      include: { collection: { select: { id: true, userId: true, price: true } } },
    }) as Promise<BidWithCollection | null>;
  }

  async create(data: { collectionId: string; price: number; userId: string }): Promise<BidWithUser> {
    return prisma.bid.create({ data, include: withUser }) as Promise<BidWithUser>;
  }

  async update(id: string, data: { price: number }): Promise<BidWithUser> {
    return prisma.bid.update({ where: { id }, data, include: withUser }) as Promise<BidWithUser>;
  }

  async rejectBid(id: string): Promise<BidWithUser> {
    return prisma.bid.update({ where: { id }, data: { status: "REJECTED" }, include: withUser }) as Promise<BidWithUser>;
  }

  async acceptBid(id: string, collectionId: string): Promise<BidWithUser> {
    await prisma.$transaction([
      prisma.bid.update({ where: { id }, data: { status: "ACCEPTED" } }),
      prisma.bid.updateMany({
        where: { collectionId, id: { not: id } },
        data: { status: "REJECTED" },
      }),
      prisma.collection.update({ where: { id: collectionId }, data: { status: "COMPLETED" } }),
    ]);

    return prisma.bid.findUnique({ where: { id }, include: withUser }) as Promise<BidWithUser>;
  }

  async delete(id: string): Promise<void> {
    await prisma.bid.update({ where: { id }, data: { deletedAt: new Date() } });
  }
}
