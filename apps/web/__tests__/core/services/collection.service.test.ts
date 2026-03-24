import { describe, it, expect, vi, beforeEach } from "vitest";
import { CollectionService } from "../../../app/api/core/services/collection.service";
import { AppError } from "../../../app/api/core/domain/errors";
import type { ICollectionRepository } from "../../../app/api/core/ports/collection.repository";

const mockCollection = {
  id: "col-1",
  name: "Test NFT",
  description: "A test collection",
  imageUrl: null,
  stocks: 10,
  price: 100,
  userId: "user-1",
  status: "RUNNING" as const,
  closeDate: null,
  createdAt: new Date(),
  deletedAt: null,
};

const mockCollectionWithRelations = {
  ...mockCollection,
  user: { id: "user-1", name: "Alice" },
  _count: { bids: 0 },
  maxBid: null,
  myBid: null,
};

const mockCollectionRepo: ICollectionRepository = {
  list: vi.fn(),
  findById: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
};

describe("CollectionService", () => {
  let service: CollectionService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new CollectionService(mockCollectionRepo);
  });

  describe("list", () => {
    it("delegates to collectionRepo.list", async () => {
      const expected = { data: [], nextCursor: null };
      vi.mocked(mockCollectionRepo.list).mockResolvedValue(expected);

      const options = { limit: 10 };
      const result = await service.list(options);

      expect(result).toBe(expected);
      expect(mockCollectionRepo.list).toHaveBeenCalledWith(options);
    });
  });

  describe("create", () => {
    it("creates collection and returns it with relations", async () => {
      vi.mocked(mockCollectionRepo.create).mockResolvedValue(mockCollectionWithRelations);

      const data = { name: "Test NFT", description: "Desc", stocks: 10, price: 100 };
      const result = await service.create(data, "user-1");

      expect(mockCollectionRepo.create).toHaveBeenCalledWith({ ...data, userId: "user-1" });
      expect(result).toBe(mockCollectionWithRelations);
    });

    it("passes optional imageUrl and closeDate", async () => {
      vi.mocked(mockCollectionRepo.create).mockResolvedValue(mockCollectionWithRelations);

      const closeDate = new Date("2026-12-31");
      const data = { name: "NFT", description: "Desc", imageUrl: "https://img.test", stocks: 5, price: 50, closeDate };
      await service.create(data, "user-1");

      expect(mockCollectionRepo.create).toHaveBeenCalledWith({ ...data, userId: "user-1" });
    });
  });

  describe("update", () => {
    it("throws NOT_FOUND when collection does not exist", async () => {
      vi.mocked(mockCollectionRepo.findById).mockResolvedValue(null);
      await expect(service.update("col-1", { name: "New" }, "user-1")).rejects.toMatchObject({
        code: "NOT_FOUND",
        statusCode: 404,
      });
    });

    it("throws FORBIDDEN when user is not the collection owner", async () => {
      vi.mocked(mockCollectionRepo.findById).mockResolvedValue(mockCollection);
      await expect(service.update("col-1", { name: "New" }, "other-user")).rejects.toMatchObject({
        code: "FORBIDDEN",
        statusCode: 403,
      });
    });

    it("updates and returns collection when authorized", async () => {
      const updated = { ...mockCollectionWithRelations, name: "New Name" };
      vi.mocked(mockCollectionRepo.findById).mockResolvedValue(mockCollection);
      vi.mocked(mockCollectionRepo.update).mockResolvedValue(updated);

      const result = await service.update("col-1", { name: "New Name" }, "user-1");

      expect(mockCollectionRepo.update).toHaveBeenCalledWith("col-1", { name: "New Name" });
      expect(result).toBe(updated);
    });
  });

  describe("delete", () => {
    it("throws NOT_FOUND when collection does not exist", async () => {
      vi.mocked(mockCollectionRepo.findById).mockResolvedValue(null);
      await expect(service.delete("col-1", "user-1")).rejects.toMatchObject({
        code: "NOT_FOUND",
        statusCode: 404,
      });
    });

    it("throws FORBIDDEN when user is not the collection owner", async () => {
      vi.mocked(mockCollectionRepo.findById).mockResolvedValue(mockCollection);
      await expect(service.delete("col-1", "other-user")).rejects.toMatchObject({
        code: "FORBIDDEN",
        statusCode: 403,
      });
    });

    it("deletes collection when authorized", async () => {
      vi.mocked(mockCollectionRepo.findById).mockResolvedValue(mockCollection);
      vi.mocked(mockCollectionRepo.delete).mockResolvedValue(undefined);

      await service.delete("col-1", "user-1");

      expect(mockCollectionRepo.delete).toHaveBeenCalledWith("col-1");
    });

    it("throws AppError instance on authorization failure", async () => {
      vi.mocked(mockCollectionRepo.findById).mockResolvedValue(mockCollection);
      await expect(service.delete("col-1", "other-user")).rejects.toBeInstanceOf(AppError);
    });
  });
});
