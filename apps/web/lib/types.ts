export interface User {
  id: string;
  name: string;
  email: string;
}

export interface Collection {
  id: string;
  name: string;
  description: string;
  stocks: number;
  price: number;
  userId: string;
  user: { id: string; name: string };
  _count: { bids: number };
  maxBid: number | null;
  myBid: { id: string; price: number; status: "PENDING" | "ACCEPTED" | "REJECTED" } | null;
}

export interface Bid {
  id: string;
  price: number;
  status: "PENDING" | "ACCEPTED" | "REJECTED";
  userId: string;
  user: { id: string; name: string };
}

export type OpenBidModal = (
  collectionId: string,
  collectionName: string,
  minPrice: number,
  existingBid?: Bid,
  onBidSuccess?: () => void
) => void;
