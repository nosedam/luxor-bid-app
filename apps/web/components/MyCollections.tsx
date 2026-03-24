"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@workspace/ui/components/button";
import { CollectionCard } from "./CollectionCard";
import { CollectionModal } from "./CollectionModal";
import { fetchWithAuth } from "@/lib/fetchWithAuth";
import type { User, OpenBidModal } from "@/lib/types";

interface Props {
  session: User;
  expandedId: string | null;
  setExpandedId: (id: string | null) => void;
  onBid: OpenBidModal;
}

export function MyCollections({ session, expandedId, setExpandedId, onBid }: Props) {
  const [myCollections, setMyCollections] = useState<any[]>([]);
  const [modalCollection, setModalCollection] = useState<any | null | "new">(null);

  const fetchMyCollections = useCallback(async () => {
    const res = await fetchWithAuth(`/api/adapters/collections?userId=${session.id}`);
    const data = await res.json();
    setMyCollections(data.data ?? []);
  }, [session.id]);

  useEffect(() => { fetchMyCollections(); }, [fetchMyCollections]);

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-medium">My Collections</h2>
        <Button size="sm" variant="outline" onClick={() => setModalCollection("new")}>
          + New
        </Button>
      </div>

      {myCollections.length === 0 ? (
        <p className="text-sm text-muted-foreground">No collections yet.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {myCollections.map((col) => (
            <CollectionCard
              key={col.id}
              collection={col}
              sessionUserId={session.id}
              isExpanded={expandedId === col.id}
              onToggle={() => setExpandedId(expandedId === col.id ? null : col.id)}
              onBid={(collectionId, existingBid, onBidSuccess) =>
                onBid(collectionId, col.name, col.maxBid ?? col.price, existingBid, onBidSuccess)
              }
              onRefresh={fetchMyCollections}
              onEdit={() => setModalCollection(col)}
            />
          ))}
        </div>
      )}

      {modalCollection !== null && (
        <CollectionModal
          existing={modalCollection === "new" ? undefined : modalCollection}
          onClose={() => setModalCollection(null)}
          onSuccess={fetchMyCollections}
        />
      )}
    </section>
  );
}
