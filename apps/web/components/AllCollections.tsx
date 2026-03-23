"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { CollectionCard } from "./CollectionCard";
import type { User, OpenBidModal } from "@/lib/types";

interface Props {
  session: User | null;
  search: string;
  expandedId: string | null;
  setExpandedId: (id: string | null) => void;
  onBid: OpenBidModal;
}

export function AllCollections({ session, search, expandedId, setExpandedId, onBid }: Props) {
  const [allCollections, setAllCollections] = useState<any[]>([]);
  const [allCursor, setAllCursor] = useState<string | null>(null);
  const [allHasMore, setAllHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const fetchAllCollections = useCallback(async () => {
    const params = new URLSearchParams();
    if (session) params.set("excludeUserId", session.id);
    if (search) params.set("search", search);
    params.set("excludeCompleted", "true");
    params.set("limit", "10");
    const res = await fetch(`/api/adapters/collections?${params}`);
    const data = await res.json();
    setAllCollections(data.data ?? []);
    setAllCursor(data.nextCursor ?? null);
    setAllHasMore(!!data.nextCursor);
  }, [session, search]);

  const loadMoreCollections = useCallback(async () => {
    if (!allHasMore || loadingMore || !allCursor) return;
    setLoadingMore(true);
    const params = new URLSearchParams();
    if (session) params.set("excludeUserId", session.id);
    if (search) params.set("search", search);
    params.set("excludeCompleted", "true");
    params.set("limit", "10");
    params.set("cursor", allCursor);
    const res = await fetch(`/api/adapters/collections?${params}`);
    const data = await res.json();
    setAllCursor(data.nextCursor ?? null);
    setAllHasMore(!!data.nextCursor);
    setLoadingMore(false);
  }, [allHasMore, loadingMore, allCursor, session, search]);

  useEffect(() => { fetchAllCollections(); }, [fetchAllCollections]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      (entries) => { if (entries[0]?.isIntersecting) loadMoreCollections(); },
      { threshold: 0.1 }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [loadMoreCollections]);

  return (
    <section>
      <h2 className="font-medium mb-3">All Collections</h2>
      {allCollections.length === 0 ? (
        <p className="text-sm text-muted-foreground">No collections found.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {allCollections.map((col) => (
            <CollectionCard
              key={col.id}
              collection={col}
              sessionUserId={session?.id}
              isExpanded={expandedId === col.id}
              onToggle={() => setExpandedId(expandedId === col.id ? null : col.id)}
              onBid={(collectionId, existingBid, onBidSuccess) =>
                onBid(collectionId, col.name, col.price, existingBid, onBidSuccess)
              }
              onRefresh={fetchAllCollections}
            />
          ))}
          <div ref={sentinelRef} className="py-2 text-center text-sm text-muted-foreground">
            {loadingMore ? "Loading..." : allHasMore ? "" : "No more collections"}
          </div>
        </div>
      )}
    </section>
  );
}
