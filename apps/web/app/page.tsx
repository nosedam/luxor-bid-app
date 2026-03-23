"use client";

import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { Button } from "@workspace/ui/components/button";
import { LoginModal } from "@/components/LoginModal";
import { BidModal } from "@/components/BidModal";
import { MyCollections } from "@/components/MyCollections";
import { AllCollections } from "@/components/AllCollections";
import type { User, Bid } from "@/lib/types";

interface BidModalState {
  open: boolean;
  collectionId: string;
  collectionName: string;
  minPrice: number;
  existingBid?: Bid;
  onBidSuccess?: () => void;
}

export default function Page() {
  const [session, setSession] = useState<User | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [loginOpen, setLoginOpen] = useState(false);
  const [bidModal, setBidModal] = useState<BidModalState>({
    open: false,
    collectionId: "",
    collectionName: "",
    minPrice: 0,
  });

  useEffect(() => {
    fetch("/api/adapters/auth/refresh", { method: "POST" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (d?.user) setSession(d.user); });

    // Proactively refresh 1 minute before the 15m access token expires
    const REFRESH_INTERVAL_MS = 14 * 60 * 1000;
    const interval = setInterval(async () => {
      const r = await fetch("/api/adapters/auth/refresh", { method: "POST" });
      if (!r.ok) setSession(null);
    }, REFRESH_INTERVAL_MS);

    return () => clearInterval(interval);
  }, []);

  async function handleLogout() {
    await fetch("/api/adapters/auth/logout", { method: "POST" });
    setSession(null);
  }

  function openBidModal(
    collectionId: string,
    collectionName: string,
    minPrice: number,
    existingBid?: Bid,
    onBidSuccess?: () => void
  ) {
    setBidModal({ open: true, collectionId, collectionName, minPrice, existingBid, onBidSuccess });
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border px-6 py-3 flex items-center gap-4">
        <h1 className="font-semibold text-lg shrink-0">Luxor</h1>
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <input
            className="w-full border border-border rounded-lg pl-9 pr-3 py-1.5 text-sm bg-background"
            placeholder="Search collections..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="ml-auto flex items-center gap-2">
          {session ? (
            <>
              <span className="text-sm text-muted-foreground hidden sm:block">{session.name}</span>
              <Button variant="outline" size="sm" onClick={handleLogout}>Logout</Button>
            </>
          ) : (
            <Button size="sm" onClick={() => setLoginOpen(true)}>Login</Button>
          )}
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6 flex flex-col gap-8">
        {session && (
          <MyCollections
            session={session}
            expandedId={expandedId}
            setExpandedId={setExpandedId}
            onBid={openBidModal}
          />
        )}
        <AllCollections
          session={session}
          search={search}
          expandedId={expandedId}
          setExpandedId={setExpandedId}
          onBid={openBidModal}
        />
      </main>

      {loginOpen && (
        <LoginModal
          onClose={() => setLoginOpen(false)}
          onSuccess={(user) => {
            setSession(user);
            setLoginOpen(false);
          }}
        />
      )}

      {bidModal.open && (
        <BidModal
          collectionId={bidModal.collectionId}
          collectionName={bidModal.collectionName}
          minPrice={bidModal.minPrice}
          existingBid={bidModal.existingBid}
          onClose={() => setBidModal((s) => ({ ...s, open: false }))}
          onSuccess={() => { bidModal.onBidSuccess?.(); }}
        />
      )}
    </div>
  );
}
