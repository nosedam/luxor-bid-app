"use client";

import { useState } from "react";
import { Button } from "@workspace/ui/components/button";
import { fetchWithAuth } from "@/lib/fetchWithAuth";

interface BidModalProps {
  collectionId: string;
  collectionName: string;
  minPrice: number;
  existingBid?: { id: string; price: number };
  onClose: () => void;
  onSuccess: () => void;
}

export function BidModal({ collectionId, collectionName, minPrice, existingBid, onClose, onSuccess }: BidModalProps) {
  const [price, setPrice] = useState(existingBid ? String(existingBid.price) : "");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const parsed = parseFloat(price);
    if (isNaN(parsed) || parsed <= 0) {
      setError("Enter a valid positive price");
      return;
    }
    if (parsed < minPrice) {
      setError(`Bid must be at least $${minPrice.toFixed(2)}`);
      return;
    }

    setLoading(true);
    try {
      const res = existingBid
        ? await fetchWithAuth(`/api/adapters/bids/${existingBid.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ price: parsed }),
          })
        : await fetchWithAuth("/api/adapters/bids", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ collectionId, price: parsed }),
          });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong");
      } else {
        onSuccess();
        onClose();
      }
    } catch {
      setError("Network error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-background border border-border rounded-xl w-full max-w-sm p-6 shadow-lg">
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-semibold text-lg">
            {existingBid ? "Edit Bid" : "Place Bid"}
          </h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-xl leading-none">×</button>
        </div>
        <p className="text-sm text-muted-foreground mb-3">{collectionName}</p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <input
            className="border border-border rounded-lg px-3 py-2 text-sm bg-background"
            placeholder={`Min $${minPrice.toFixed(2)}`}
            type="number"
            min={minPrice}
            step="0.01"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            required
          />
          {error && <p className="text-destructive text-xs">{error}</p>}
          <Button type="submit" disabled={loading}>
            {loading ? "..." : existingBid ? "Update bid" : "Place bid"}
          </Button>
        </form>
      </div>
    </div>
  );
}
