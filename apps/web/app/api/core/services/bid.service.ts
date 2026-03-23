import type { IBidRepository } from "../ports/bid.repository";
import type { ICollectionRepository } from "../ports/collection.repository";
import type { BidWithUser } from "../domain/bid";
import { AppError } from "../domain/errors";

export class BidService {
  constructor(
    private readonly bidRepo: IBidRepository,
    private readonly collectionRepo: ICollectionRepository
  ) {}

  async list(options: { collectionId?: string; userId?: string; page: number; limit: number }) {
    return this.bidRepo.list(options);
  }

  async create(data: { collectionId: string; price: number }, userId: string): Promise<BidWithUser> {
    const collection = await this.collectionRepo.findById(data.collectionId);
    if (!collection) throw new AppError("NOT_FOUND", 404, "Collection not found");
    if (data.price < collection.price) {
      throw new AppError("INVALID_INPUT", 400, `Bid must be at least $${collection.price.toFixed(2)}`);
    }

    const existing = await this.bidRepo.findByUserAndCollection(userId, data.collectionId);
    if (existing) throw new AppError("CONFLICT", 409, "You already have a bid on this collection");

    return this.bidRepo.create({ ...data, userId });
  }

  async update(id: string, price: number, userId: string): Promise<BidWithUser> {
    const bid = await this.bidRepo.findById(id);
    if (!bid) throw new AppError("NOT_FOUND", 404, "Bid not found");
    if (bid.userId !== userId) throw new AppError("FORBIDDEN", 403, "Forbidden");
    if (bid.status !== "PENDING") throw new AppError("INVALID_STATE", 400, "Cannot edit a non-pending bid");
    if (price < bid.collection.price) {
      throw new AppError("INVALID_INPUT", 400, `Bid must be at least $${bid.collection.price.toFixed(2)}`);
    }

    return this.bidRepo.update(id, { price });
  }

  async delete(id: string, userId: string): Promise<void> {
    const bid = await this.bidRepo.findById(id);
    if (!bid) throw new AppError("NOT_FOUND", 404, "Bid not found");
    if (bid.userId !== userId) throw new AppError("FORBIDDEN", 403, "Forbidden");

    await this.bidRepo.delete(id);
  }

  async accept(id: string, userId: string): Promise<BidWithUser> {
    const bid = await this.bidRepo.findById(id);
    if (!bid) throw new AppError("NOT_FOUND", 404, "Bid not found");
    if (bid.collection.userId !== userId) {
      throw new AppError("FORBIDDEN", 403, "Forbidden: not the collection owner");
    }

    return this.bidRepo.acceptBid(id, bid.collectionId);
  }

  async reject(id: string, userId: string): Promise<BidWithUser> {
    const bid = await this.bidRepo.findById(id);
    if (!bid) throw new AppError("NOT_FOUND", 404, "Bid not found");
    if (bid.collection.userId !== userId) {
      throw new AppError("FORBIDDEN", 403, "Forbidden: not the collection owner");
    }

    return this.bidRepo.rejectBid(id);
  }
}
