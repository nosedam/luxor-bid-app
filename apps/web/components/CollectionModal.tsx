"use client";

import { useState } from "react";
import { Button } from "@workspace/ui/components/button";
import { fetchWithAuth } from "@/lib/fetchWithAuth";

interface CollectionModalProps {
  existing?: { id: string; name: string; description: string; stocks: number; price: number; imageUrl: string | null; closeDate: string | null };
  onClose: () => void;
  onSuccess: () => void;
}

export function CollectionModal({ existing, onClose, onSuccess }: CollectionModalProps) {
  const [form, setForm] = useState({
    name: existing?.name ?? "",
    description: existing?.description ?? "",
    stocks: existing ? String(existing.stocks) : "",
    price: existing ? existing.price.toFixed(2) : "",
    closeDate: existing?.closeDate ? existing.closeDate.slice(0, 10) : "",
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(existing?.imageUrl ?? null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    setImageFile(file);
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => setImagePreview(ev.target?.result as string);
      reader.readAsDataURL(file);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setUploading(true);

    try {
      let imageUrl: string | null = existing?.imageUrl ?? null;
      if (imageFile) {
        const fd = new FormData();
        fd.append("file", imageFile);
        const uploadRes = await fetchWithAuth("/api/adapters/collections/upload", { method: "POST", body: fd });
        if (uploadRes.ok) {
          imageUrl = (await uploadRes.json()).url;
        }
      }

      const body = JSON.stringify({
        name: form.name,
        description: form.description,
        imageUrl,
        stocks: parseInt(form.stocks),
        price: parseFloat(form.price),
        closeDate: form.closeDate ? new Date(form.closeDate).toISOString() : null,
      });

      const res = existing
        ? await fetchWithAuth(`/api/adapters/collections/${existing.id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body })
        : await fetchWithAuth("/api/adapters/collections", { method: "POST", headers: { "Content-Type": "application/json" }, body });

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
      setUploading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/40">
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="bg-background border border-border rounded-xl w-full max-w-sm p-6 shadow-lg">
        <div className="flex justify-between items-center mb-4">
          <h2 className="font-semibold text-lg">{existing ? "Edit Collection" : "New Collection"}</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground text-xl leading-none">×</button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs text-muted-foreground">NFT Image (optional)</label>
            <div className="flex items-center gap-3">
              {imagePreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={imagePreview} alt="preview" className="size-12 rounded-lg object-cover shrink-0" />
              ) : (
                <div className="size-12 rounded-lg shrink-0 bg-muted flex items-center justify-center">
                  <span className="text-[7px] leading-tight text-muted-foreground font-medium text-center px-0.5">No NFT Image Uploaded</span>
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
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground w-24 shrink-0">Name</span>
            <input
              className="border border-border rounded-lg px-3 py-2 text-sm bg-background flex-1"
              placeholder="Name"
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              required
            />
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground w-24 shrink-0">Description</span>
            <input
              className="border border-border rounded-lg px-3 py-2 text-sm bg-background flex-1"
              placeholder="Description"
              value={form.description}
              onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              required
            />
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground w-24 shrink-0">Units</span>
            <input
              className="border border-border rounded-lg px-3 py-2 text-sm bg-background flex-1"
              placeholder="0"
              type="number"
              min="1"
              value={form.stocks}
              onChange={(e) => setForm((p) => ({ ...p, stocks: e.target.value }))}
              required
            />
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground w-24 shrink-0">Price</span>
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">$</span>
              <input
                className="border border-border rounded-lg pl-6 pr-3 py-2 text-sm bg-background w-full"
                placeholder="0.00"
                type="number"
                min="0.01"
                step="0.01"
                value={form.price}
                onChange={(e) => setForm((p) => ({ ...p, price: e.target.value }))}
                required
              />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground w-24 shrink-0">Close Date</span>
            <input
              className="border border-border rounded-lg px-3 py-2 text-sm bg-background flex-1"
              type="date"
              value={form.closeDate}
              onChange={(e) => setForm((p) => ({ ...p, closeDate: e.target.value }))}
            />
          </div>
          {error && <p className="text-destructive text-xs">{error}</p>}
          <Button type="submit" disabled={uploading}>
            {uploading ? "Saving..." : existing ? "Save" : "Create"}
          </Button>
        </form>
        </div>
      </div>
    </div>
  );
}
