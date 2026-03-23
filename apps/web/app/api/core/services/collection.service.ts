import type { ICollectionRepository, ListCollectionsOptions } from "../ports/collection.repository";
import type { CollectionWithRelations } from "../domain/collection";
import { AppError } from "../domain/errors";

export class CollectionService {
  constructor(private readonly collectionRepo: ICollectionRepository) {}

  async list(options: ListCollectionsOptions) {
    return this.collectionRepo.list(options);
  }

  async create(
    data: { name: string; description: string; imageUrl?: string | null; stocks: number; price: number },
    userId: string
  ): Promise<CollectionWithRelations> {
    return this.collectionRepo.create({ ...data, userId });
  }

  async update(
    id: string,
    data: Partial<{ name: string; description: string; imageUrl: string | null; stocks: number; price: number }>,
    userId: string
  ): Promise<CollectionWithRelations> {
    const collection = await this.collectionRepo.findById(id);
    if (!collection) throw new AppError("NOT_FOUND", 404, "Collection not found");
    if (collection.userId !== userId) throw new AppError("FORBIDDEN", 403, "Forbidden");

    return this.collectionRepo.update(id, data);
  }

  async delete(id: string, userId: string): Promise<void> {
    const collection = await this.collectionRepo.findById(id);
    if (!collection) throw new AppError("NOT_FOUND", 404, "Collection not found");
    if (collection.userId !== userId) throw new AppError("FORBIDDEN", 403, "Forbidden");

    await this.collectionRepo.delete(id);
  }
}
