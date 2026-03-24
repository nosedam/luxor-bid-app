import { describe, it, expect, vi, beforeEach } from "vitest";
import { BidService } from "../../../app/api/core/services/bid.service";
import { AppError } from "../../../app/api/core/domain/errors";
import type { IBidRepository } from "../../../app/api/core/ports/bid.repository";
import type { ICollectionRepository } from "../../../app/api/core/ports/collection.repository";

const mockCollection = {
  id: "col-1",
  name: "Test NFT",
  description: "A test collection",
  imageUrl: null,
  stocks: 10,
  price: 100,
  userId: "owner-1",
  status: "RUNNING" as const,
  closeDate: null,
  createdAt: new Date(),
  deletedAt: null,
};

const makeBidWithCollection = (overrides: Partial<{
  id: string; userId: string; status: "PENDING" | "ACCEPTED" | "REJECTED"; price: number; collectionPrice: number; collectionOwnerId: string;
}> = {}) => ({
  id: overrides.id ?? "bid-1",
  collectionId: "col-1",
  price: overrides.price ?? 150,
  userId: overrides.userId ?? "user-1",
  status: overrides.status ?? "PENDING" as const,
  createdAt: new Date(),
  deletedAt: null,
  collection: {
    id: "col-1",
    userId: overrides.collectionOwnerId ?? "owner-1",
    price: overrides.collectionPrice ?? 100,
  },
});

const makeBidWithUser = (overrides: Partial<{ id: string; userId: string; status: "PENDING" | "ACCEPTED" | "REJECTED" }> = {}) => ({
  id: overrides.id ?? "bid-1",
  collectionId: "col-1",
  price: 150,
  userId: overrides.userId ?? "user-1",
  status: overrides.status ?? "PENDING" as const,
  createdAt: new Date(),
  deletedAt: null,
  user: { id: overrides.userId ?? "user-1", name: "Alice" },
});

const mockBidRepo: IBidRepository = {
  list: vi.fn(),
  findById: vi.fn(),
  findByUserAndCollection: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  rejectBid: vi.fn(),
  acceptBid: vi.fn(),
  delete: vi.fn(),
};

const mockCollectionRepo: ICollectionRepository = {
  list: vi.fn(),
  findById: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
};

describe("BidService", () => {
  let service: BidService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new BidService(mockBidRepo, mockCollectionRepo);
  });

  describe("list", () => {
    it("delegates to bidRepo.list", async () => {
      const expected = { data: [], total: 0, page: 1, totalPages: 1 };
      vi.mocked(mockBidRepo.list).mockResolvedValue(expected);
      const result = await service.list({ page: 1, limit: 10 });
      expect(result).toBe(expected);
      expect(mockBidRepo.list).toHaveBeenCalledWith({ page: 1, limit: 10 });
    });
  });

  describe("create", () => {
    it("throws NOT_FOUND when collection does not exist", async () => {
      vi.mocked(mockCollectionRepo.findById).mockResolvedValue(null);
      await expect(service.create({ collectionId: "col-1", price: 150 }, "user-1")).rejects.toMatchObject({
        code: "NOT_FOUND",
        statusCode: 404,
      });
    });

    it("throws INVALID_INPUT when bid price is below minimum", async () => {
      vi.mocked(mockCollectionRepo.findById).mockResolvedValue(mockCollection);
      await expect(service.create({ collectionId: "col-1", price: 50 }, "user-1")).rejects.toMatchObject({
        code: "INVALID_INPUT",
        statusCode: 400,
      });
    });

    it("throws CONFLICT when user already has a bid on the collection", async () => {
      vi.mocked(mockCollectionRepo.findById).mockResolvedValue(mockCollection);
      vi.mocked(mockBidRepo.findByUserAndCollection).mockResolvedValue(makeBidWithUser());
      await expect(service.create({ collectionId: "col-1", price: 150 }, "user-1")).rejects.toMatchObject({
        code: "CONFLICT",
        statusCode: 409,
      });
    });

    it("creates and returns bid when valid", async () => {
      const bid = makeBidWithUser();
      vi.mocked(mockCollectionRepo.findById).mockResolvedValue(mockCollection);
      vi.mocked(mockBidRepo.findByUserAndCollection).mockResolvedValue(null);
      vi.mocked(mockBidRepo.create).mockResolvedValue(bid);

      const result = await service.create({ collectionId: "col-1", price: 150 }, "user-1");

      expect(mockBidRepo.create).toHaveBeenCalledWith({ collectionId: "col-1", price: 150, userId: "user-1" });
      expect(result).toBe(bid);
    });

    it("accepts bid at exactly the minimum price", async () => {
      const bid = makeBidWithUser();
      vi.mocked(mockCollectionRepo.findById).mockResolvedValue(mockCollection);
      vi.mocked(mockBidRepo.findByUserAndCollection).mockResolvedValue(null);
      vi.mocked(mockBidRepo.create).mockResolvedValue(bid);

      await expect(service.create({ collectionId: "col-1", price: 100 }, "user-1")).resolves.toBeDefined();
    });
  });

  describe("update", () => {
    it("throws NOT_FOUND when bid does not exist", async () => {
      vi.mocked(mockBidRepo.findById).mockResolvedValue(null);
      await expect(service.update("bid-1", 200, "user-1")).rejects.toMatchObject({ code: "NOT_FOUND" });
    });

    it("throws FORBIDDEN when user is not the bid owner", async () => {
      vi.mocked(mockBidRepo.findById).mockResolvedValue(makeBidWithCollection({ userId: "other" }));
      await expect(service.update("bid-1", 200, "user-1")).rejects.toMatchObject({ code: "FORBIDDEN", statusCode: 403 });
    });

    it("throws INVALID_STATE when bid is not PENDING", async () => {
      vi.mocked(mockBidRepo.findById).mockResolvedValue(makeBidWithCollection({ status: "ACCEPTED" }));
      await expect(service.update("bid-1", 200, "user-1")).rejects.toMatchObject({ code: "INVALID_STATE", statusCode: 400 });
    });

    it("throws INVALID_INPUT when new price is below collection minimum", async () => {
      vi.mocked(mockBidRepo.findById).mockResolvedValue(makeBidWithCollection({ collectionPrice: 100 }));
      await expect(service.update("bid-1", 50, "user-1")).rejects.toMatchObject({ code: "INVALID_INPUT" });
    });

    it("updates and returns bid when valid", async () => {
      const updated = makeBidWithUser();
      vi.mocked(mockBidRepo.findById).mockResolvedValue(makeBidWithCollection());
      vi.mocked(mockBidRepo.update).mockResolvedValue(updated);

      const result = await service.update("bid-1", 200, "user-1");

      expect(mockBidRepo.update).toHaveBeenCalledWith("bid-1", { price: 200 });
      expect(result).toBe(updated);
    });
  });

  describe("delete", () => {
    it("throws NOT_FOUND when bid does not exist", async () => {
      vi.mocked(mockBidRepo.findById).mockResolvedValue(null);
      await expect(service.delete("bid-1", "user-1")).rejects.toMatchObject({ code: "NOT_FOUND" });
    });

    it("throws FORBIDDEN when user is not the bid owner", async () => {
      vi.mocked(mockBidRepo.findById).mockResolvedValue(makeBidWithCollection({ userId: "other" }));
      await expect(service.delete("bid-1", "user-1")).rejects.toMatchObject({ code: "FORBIDDEN" });
    });

    it("deletes the bid when authorized", async () => {
      vi.mocked(mockBidRepo.findById).mockResolvedValue(makeBidWithCollection());
      vi.mocked(mockBidRepo.delete).mockResolvedValue(undefined);

      await service.delete("bid-1", "user-1");

      expect(mockBidRepo.delete).toHaveBeenCalledWith("bid-1");
    });
  });

  describe("accept", () => {
    it("throws NOT_FOUND when bid does not exist", async () => {
      vi.mocked(mockBidRepo.findById).mockResolvedValue(null);
      await expect(service.accept("bid-1", "owner-1")).rejects.toMatchObject({ code: "NOT_FOUND" });
    });

    it("throws FORBIDDEN when user is not the collection owner", async () => {
      vi.mocked(mockBidRepo.findById).mockResolvedValue(makeBidWithCollection({ collectionOwnerId: "owner-1" }));
      await expect(service.accept("bid-1", "not-owner")).rejects.toMatchObject({ code: "FORBIDDEN" });
    });

    it("calls acceptBid and returns updated bid", async () => {
      const updated = makeBidWithUser({ status: "ACCEPTED" });
      vi.mocked(mockBidRepo.findById).mockResolvedValue(makeBidWithCollection({ collectionOwnerId: "owner-1" }));
      vi.mocked(mockBidRepo.acceptBid).mockResolvedValue(updated);

      const result = await service.accept("bid-1", "owner-1");

      expect(mockBidRepo.acceptBid).toHaveBeenCalledWith("bid-1", "col-1");
      expect(result).toBe(updated);
    });
  });

  describe("reject", () => {
    it("throws NOT_FOUND when bid does not exist", async () => {
      vi.mocked(mockBidRepo.findById).mockResolvedValue(null);
      await expect(service.reject("bid-1", "owner-1")).rejects.toMatchObject({ code: "NOT_FOUND" });
    });

    it("throws FORBIDDEN when user is not the collection owner", async () => {
      vi.mocked(mockBidRepo.findById).mockResolvedValue(makeBidWithCollection({ collectionOwnerId: "owner-1" }));
      await expect(service.reject("bid-1", "not-owner")).rejects.toMatchObject({ code: "FORBIDDEN" });
    });

    it("calls rejectBid and returns updated bid", async () => {
      const updated = makeBidWithUser({ status: "REJECTED" });
      vi.mocked(mockBidRepo.findById).mockResolvedValue(makeBidWithCollection({ collectionOwnerId: "owner-1" }));
      vi.mocked(mockBidRepo.rejectBid).mockResolvedValue(updated);

      const result = await service.reject("bid-1", "owner-1");

      expect(mockBidRepo.rejectBid).toHaveBeenCalledWith("bid-1");
      expect(result).toBe(updated);
    });
  });
});
