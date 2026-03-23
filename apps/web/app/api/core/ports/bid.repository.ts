import type { BidWithUser, BidWithCollection } from "../domain/bid";

export interface ListBidsOptions {
  collectionId?: string;
  userId?: string;
  page: number;
  limit: number;
}

export interface IBidRepository {
  list(options: ListBidsOptions): Promise<{ data: BidWithUser[]; total: number; page: number; totalPages: number }>;
  findById(id: string): Promise<BidWithCollection | null>;
  findByUserAndCollection(userId: string, collectionId: string): Promise<BidWithUser | null>;
  create(data: { collectionId: string; price: number; userId: string }): Promise<BidWithUser>;
  update(id: string, data: { price: number }): Promise<BidWithUser>;
  rejectBid(id: string): Promise<BidWithUser>;
  acceptBid(id: string, collectionId: string): Promise<BidWithUser>;
  delete(id: string): Promise<void>;
}
