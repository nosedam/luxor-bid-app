"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp, Pencil } from "lucide-react";
import { Button } from "@workspace/ui/components/button";
import { BidItem } from "./BidItem";
import { fetchWithAuth } from "@/lib/fetchWithAuth";

interface Bid {
  id: string;
  price: number;
  status: "PENDING" | "ACCEPTED" | "REJECTED";
  userId: string;
  user: { id: string; name: string };
}

interface Collection {
  id: string;
  name: string;
  description: string;
  imageUrl: string | null;
  stocks: number;
  price: number;
  userId: string;
  status: "RUNNING" | "COMPLETED";
  user: { id: string; name: string };
  _count: { bids: number };
  maxBid: number | null;
  myBid: { id: string; price: number; status: "PENDING" | "ACCEPTED" | "REJECTED" } | null;
}

interface CollectionCardProps {
  collection: Collection;
  sessionUserId?: string;
  isExpanded: boolean;
  onToggle: () => void;
  onBid: (collectionId: string, existingBid?: Bid, onBidSuccess?: () => void) => void;
  onRefresh: () => void;
  onEdit?: () => void;
}

export function CollectionCard({
  collection,
  sessionUserId,
  isExpanded,
  onToggle,
  onBid,
  onRefresh,
  onEdit,
}: CollectionCardProps) {
  const [bids, setBids] = useState<Bid[]>([]);
  const [loadingBids, setLoadingBids] = useState(false);
  const isOwner = collection.userId === sessionUserId;

  async function loadBids() {
    if (!isExpanded) {
      setLoadingBids(true);
      try {
        const res = await fetch(`/api/adapters/bids?collectionId=${collection.id}&limit=50`);
        const data = await res.json();
        setBids(data.data ?? []);
      } finally {
        setLoadingBids(false);
      }
    }
    onToggle();
  }

  async function refreshBids() {
    const res = await fetch(`/api/adapters/bids?collectionId=${collection.id}&limit=50`);
    const data = await res.json();
    setBids(data.data ?? []);
    onRefresh();
  }

  async function handleDelete(bidId: string) {
    await fetchWithAuth(`/api/adapters/bids/${bidId}`, { method: "DELETE" });
    await refreshBids();
  }

  async function handleAccept(bidId: string) {
    await fetchWithAuth(`/api/adapters/bids/${bidId}/accept`, { method: "PATCH" });
    await refreshBids();
  }

  async function handleReject(bidId: string) {
    await fetchWithAuth(`/api/adapters/bids/${bidId}/reject`, { method: "PATCH" });
    await refreshBids();
  }

  const myBid = bids.find((b) => b.userId === sessionUserId);

  const myBidBorderClass = collection.myBid
    ? collection.myBid.status === "ACCEPTED"
      ? "border-green-500"
      : collection.myBid.status === "REJECTED"
      ? "border-red-500"
      : "border-amber-400"
    : "border-border";

  const myBidBadgeClass = collection.myBid
    ? collection.myBid.status === "ACCEPTED"
      ? "bg-green-500/10 text-green-600"
      : collection.myBid.status === "REJECTED"
      ? "bg-red-500/10 text-red-600"
      : "bg-amber-400/10 text-amber-600"
    : "";

  return (
    <div className={`border rounded-xl overflow-hidden ${myBidBorderClass}`}>
      <button
        className="w-full flex items-center justify-between p-4 text-left hover:bg-muted/50 transition-colors"
        onClick={loadBids}
      >
        <div className="flex items-center gap-3 min-w-0">
          {collection.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={collection.imageUrl}
              alt={collection.name}
              className="size-10 rounded-lg object-cover shrink-0"
            />
          ) : (
            <div className="size-10 rounded-lg shrink-0 bg-muted flex items-center justify-center text-center">
              <span className="text-[7px] leading-tight text-muted-foreground font-medium px-0.5">
                No NFT Image Uploaded
              </span>
            </div>
          )}
          <div className="min-w-0">
            <p className="font-medium truncate">{collection.name}</p>
            <p className="text-xs text-muted-foreground truncate">{collection.description}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0 ml-3">
          <span className="text-sm font-medium">${collection.price.toFixed(2)}</span>
          {collection.maxBid != null && (
            <span className="text-xs text-muted-foreground">top ${collection.maxBid.toFixed(2)}</span>
          )}
          <span className="text-xs text-muted-foreground">{collection.stocks} stock</span>
          <span className="text-xs text-muted-foreground">{collection._count.bids} bids</span>
          {collection.status === "COMPLETED" && (
            <span className="text-xs font-medium px-1.5 py-0.5 rounded bg-green-500/10 text-green-600">
              Completed
            </span>
          )}
          {collection.myBid && (
            <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${myBidBadgeClass}`}>
              my bid ${collection.myBid.price.toFixed(2)}
            </span>
          )}
          {isOwner && onEdit && (
            <span
              role="button"
              tabIndex={0}
              className="p-1 rounded hover:bg-muted transition-colors"
              onClick={(e) => { e.stopPropagation(); onEdit(); }}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.stopPropagation(); onEdit(); } }}
            >
              <Pencil className="size-3.5 text-muted-foreground" />
            </span>
          )}
          {isExpanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
        </div>
      </button>

      {isExpanded && (
        <div className="border-t border-border px-4 pb-4 pt-3">
          {loadingBids ? (
            <p className="text-xs text-muted-foreground">Loading bids...</p>
          ) : (
            <div className="flex flex-col gap-1">
              {bids.length === 0 && (
                <p className="text-xs text-muted-foreground">No bids yet.</p>
              )}
              {bids.map((bid) => (
                <BidItem
                  key={bid.id}
                  bid={bid}
                  sessionUserId={sessionUserId}
                  isCollectionOwner={isOwner}
                  onEdit={(b) => onBid(collection.id, b, refreshBids)}
                  onDelete={handleDelete}
                  onAccept={handleAccept}
                  onReject={handleReject}
                />
              ))}
              {sessionUserId && !isOwner && !myBid && (
                <Button
                  size="sm"
                  variant="outline"
                  className="mt-2 w-fit"
                  onClick={() => onBid(collection.id, undefined, refreshBids)}
                >
                  Bid
                </Button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
