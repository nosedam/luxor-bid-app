export type BidStatus = "PENDING" | "ACCEPTED" | "REJECTED";

export interface Bid {
  id: string;
  collectionId: string;
  price: number;
  userId: string;
  status: BidStatus;
  createdAt: Date;
  deletedAt: Date | null;
}

export interface BidWithUser extends Bid {
  user: { id: string; name: string };
}

export interface BidWithCollection extends Bid {
  collection: { id: string; userId: string; price: number };
}
