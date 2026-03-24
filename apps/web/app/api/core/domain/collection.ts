export interface Collection {
  id: string;
  name: string;
  description: string;
  imageUrl: string | null;
  stocks: number;
  price: number;
  userId: string;
  status: "RUNNING" | "COMPLETED";
  closeDate: Date | null;
  createdAt: Date;
  deletedAt: Date | null;
}

export interface CollectionWithRelations extends Collection {
  user: { id: string; name: string };
  _count: { bids: number };
  maxBid: number | null;
  myBid: { id: string; price: number; status: string } | null;
}
