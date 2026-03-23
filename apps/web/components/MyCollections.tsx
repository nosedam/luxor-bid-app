"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@workspace/ui/components/button";
import { CollectionCard } from "./CollectionCard";
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
  const [showNewForm, setShowNewForm] = useState(false);
  const [newCollection, setNewCollection] = useState({ name: "", description: "", stocks: "", price: "" });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [editingCollection, setEditingCollection] = useState<any | null>(null);
  const [editForm, setEditForm] = useState({ name: "", description: "", stocks: "", price: "" });
  const [editImageFile, setEditImageFile] = useState<File | null>(null);
  const [editImagePreview, setEditImagePreview] = useState<string | null>(null);

  const fetchMyCollections = useCallback(async () => {
    const res = await fetchWithAuth(`/api/adapters/collections?userId=${session.id}`);
    const data = await res.json();
    setMyCollections(data.data ?? []);
  }, [session.id]);

  useEffect(() => { fetchMyCollections(); }, [fetchMyCollections]);

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setImageFile(file);
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => setImagePreview(ev.target?.result as string);
      reader.readAsDataURL(file);
    } else {
      setImagePreview(null);
    }
  }

  function handleEditStart(col: any) {
    setEditingCollection(col);
    setEditForm({ name: col.name, description: col.description, stocks: String(col.stocks), price: String(col.price) });
    setEditImageFile(null);
    setEditImagePreview(col.imageUrl ?? null);
  }

  function handleEditImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setEditImageFile(file);
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => setEditImagePreview(ev.target?.result as string);
      reader.readAsDataURL(file);
    }
  }

  async function handleEditCollection(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editingCollection) return;
    setUploading(true);

    let imageUrl: string | null = editingCollection.imageUrl;
    if (editImageFile) {
      const fd = new FormData();
      fd.append("file", editImageFile);
      const uploadRes = await fetchWithAuth("/api/adapters/collections/upload", { method: "POST", body: fd });
      if (uploadRes.ok) {
        const data = await uploadRes.json();
        imageUrl = data.url;
      }
    }

    const res = await fetchWithAuth(`/api/adapters/collections/${editingCollection.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: editForm.name,
        description: editForm.description,
        imageUrl,
        stocks: parseInt(editForm.stocks),
        price: parseFloat(editForm.price),
      }),
    });

    setUploading(false);
    if (res.ok) {
      setEditingCollection(null);
      setEditImageFile(null);
      setEditImagePreview(null);
      fetchMyCollections();
    }
  }

  async function handleCreateCollection(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setUploading(true);

    let imageUrl: string | null = null;
    if (imageFile) {
      const fd = new FormData();
      fd.append("file", imageFile);
      const uploadRes = await fetchWithAuth("/api/adapters/collections/upload", { method: "POST", body: fd });
      if (uploadRes.ok) {
        const data = await uploadRes.json();
        imageUrl = data.url;
      }
    }

    const res = await fetchWithAuth("/api/adapters/collections", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: newCollection.name,
        description: newCollection.description,
        imageUrl,
        stocks: parseInt(newCollection.stocks),
        price: parseFloat(newCollection.price),
      }),
    });

    setUploading(false);
    if (res.ok) {
      setNewCollection({ name: "", description: "", stocks: "", price: "" });
      setImageFile(null);
      setImagePreview(null);
      setShowNewForm(false);
      fetchMyCollections();
    }
  }

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-medium">My Collections</h2>
        <Button size="sm" variant="outline" onClick={() => setShowNewForm((v) => !v)}>
          {showNewForm ? "Cancel" : "+ New"}
        </Button>
      </div>

      {showNewForm && (
        <form onSubmit={handleCreateCollection} className="border border-border rounded-xl p-4 mb-3 flex flex-col gap-2">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground">NFT Image (optional)</label>
            <div className="flex items-center gap-3">
              {imagePreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={imagePreview} alt="preview" className="size-12 rounded-lg object-cover shrink-0" />
              ) : (
                <div className="size-12 rounded-lg shrink-0 bg-muted flex items-center justify-center">
                  <span className="text-[7px] leading-tight text-muted-foreground font-medium text-center px-0.5">
                    No NFT Image Uploaded
                  </span>
                </div>
              )}
              <input
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp"
                className="text-xs text-muted-foreground file:mr-2 file:text-xs file:border file:border-border file:rounded file:px-2 file:py-1 file:bg-background file:cursor-pointer"
                onChange={handleImageChange}
              />
            </div>
          </div>
          <input
            className="border border-border rounded-lg px-3 py-2 text-sm bg-background"
            placeholder="Name"
            value={newCollection.name}
            onChange={(e) => setNewCollection((p) => ({ ...p, name: e.target.value }))}
            required
          />
          <input
            className="border border-border rounded-lg px-3 py-2 text-sm bg-background"
            placeholder="Description"
            value={newCollection.description}
            onChange={(e) => setNewCollection((p) => ({ ...p, description: e.target.value }))}
            required
          />
          <div className="flex gap-2">
            <input
              className="border border-border rounded-lg px-3 py-2 text-sm bg-background flex-1"
              placeholder="Stocks"
              type="number"
              min="1"
              value={newCollection.stocks}
              onChange={(e) => setNewCollection((p) => ({ ...p, stocks: e.target.value }))}
              required
            />
            <input
              className="border border-border rounded-lg px-3 py-2 text-sm bg-background flex-1"
              placeholder="Price"
              type="number"
              min="0.01"
              step="0.01"
              value={newCollection.price}
              onChange={(e) => setNewCollection((p) => ({ ...p, price: e.target.value }))}
              required
            />
          </div>
          <Button type="submit" size="sm" disabled={uploading}>
            {uploading ? "Uploading..." : "Create"}
          </Button>
        </form>
      )}

      {myCollections.length === 0 ? (
        <p className="text-sm text-muted-foreground">No collections yet.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {myCollections.map((col) => (
            <div key={col.id}>
              <CollectionCard
                collection={col}
                sessionUserId={session.id}
                isExpanded={expandedId === col.id}
                onToggle={() => setExpandedId(expandedId === col.id ? null : col.id)}
                onBid={(collectionId, existingBid, onBidSuccess) =>
                  onBid(collectionId, col.name, col.price, existingBid, onBidSuccess)
                }
                onRefresh={fetchMyCollections}
                onEdit={() => handleEditStart(col)}
              />
              {editingCollection?.id === col.id && (
                <form onSubmit={handleEditCollection} className="border border-border rounded-xl p-4 mt-1 flex flex-col gap-2">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-muted-foreground">Edit Collection</span>
                    <button type="button" className="text-xs text-muted-foreground hover:text-foreground" onClick={() => setEditingCollection(null)}>Cancel</button>
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-xs text-muted-foreground">NFT Image (optional)</label>
                    <div className="flex items-center gap-3">
                      {editImagePreview ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={editImagePreview} alt="preview" className="size-12 rounded-lg object-cover shrink-0" />
                      ) : (
                        <div className="size-12 rounded-lg shrink-0 bg-muted flex items-center justify-center">
                          <span className="text-[7px] leading-tight text-muted-foreground font-medium text-center px-0.5">No NFT Image Uploaded</span>
                        </div>
                      )}
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/gif,image/webp"
                        className="text-xs text-muted-foreground file:mr-2 file:text-xs file:border file:border-border file:rounded file:px-2 file:py-1 file:bg-background file:cursor-pointer"
                        onChange={handleEditImageChange}
                      />
                    </div>
                  </div>
                  <input
                    className="border border-border rounded-lg px-3 py-2 text-sm bg-background"
                    placeholder="Name"
                    value={editForm.name}
                    onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))}
                    required
                  />
                  <input
                    className="border border-border rounded-lg px-3 py-2 text-sm bg-background"
                    placeholder="Description"
                    value={editForm.description}
                    onChange={(e) => setEditForm((p) => ({ ...p, description: e.target.value }))}
                    required
                  />
                  <div className="flex gap-2">
                    <input
                      className="border border-border rounded-lg px-3 py-2 text-sm bg-background flex-1"
                      placeholder="Stocks"
                      type="number"
                      min="1"
                      value={editForm.stocks}
                      onChange={(e) => setEditForm((p) => ({ ...p, stocks: e.target.value }))}
                      required
                    />
                    <input
                      className="border border-border rounded-lg px-3 py-2 text-sm bg-background flex-1"
                      placeholder="Price"
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={editForm.price}
                      onChange={(e) => setEditForm((p) => ({ ...p, price: e.target.value }))}
                      required
                    />
                  </div>
                  <Button type="submit" size="sm" disabled={uploading}>
                    {uploading ? "Saving..." : "Save"}
                  </Button>
                </form>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
