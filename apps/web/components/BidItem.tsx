"use client";

import { Button } from "@workspace/ui/components/button";

interface Bid {
  id: string;
  price: number;
  status: "PENDING" | "ACCEPTED" | "REJECTED";
  userId: string;
  createdAt: string;
  user: { id: string; name: string };
}

interface BidItemProps {
  bid: Bid;
  sessionUserId?: string;
  isCollectionOwner: boolean;
  onEdit: (bid: Bid) => void;
  onDelete: (bidId: string) => void;
  onAccept: (bidId: string) => void;
  onReject: (bidId: string) => void;
}

const statusColors: Record<string, string> = {
  PENDING: "text-muted-foreground",
  ACCEPTED: "text-green-600 dark:text-green-400",
  REJECTED: "text-destructive",
};

export function BidItem({ bid, sessionUserId, isCollectionOwner, onEdit, onDelete, onAccept, onReject }: BidItemProps) {
  const isOwner = bid.userId === sessionUserId;

  return (
    <div className="flex items-center justify-between gap-2 py-1 text-sm">
      <span className={statusColors[bid.status]}>
        <span className="font-medium">${bid.price.toFixed(2)}</span>
        {" "}by {bid.user.name}
        {bid.status !== "PENDING" && (
          <span className="ml-1 text-xs">({bid.status.toLowerCase()})</span>
        )}
      </span>

      <div className="flex items-center gap-2 shrink-0">
        <span className="text-xs text-muted-foreground">
          {new Date(bid.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}
        </span>
        {isOwner && bid.status === "PENDING" && (
          <>
            <Button size="xs" variant="outline" onClick={() => onEdit(bid)}>Edit</Button>
            <Button size="xs" variant="destructive" onClick={() => onDelete(bid.id)}>Remove</Button>
          </>
        )}
        {isCollectionOwner && !isOwner && bid.status === "PENDING" && (
          <>
            <Button size="xs" variant="outline" onClick={() => onAccept(bid.id)}>Accept</Button>
            <Button size="xs" variant="destructive" onClick={() => onReject(bid.id)}>Reject</Button>
          </>
        )}
      </div>
    </div>
  );
}
