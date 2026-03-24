import type { Collection, CollectionWithRelations } from "../domain/collection";

export interface ListCollectionsOptions {
  userId?: string;
  excludeUserId?: string;
  excludeCompleted?: boolean;
  search?: string;
  cursor?: string;
  limit: number;
  viewerUserId?: string;
}

export interface ICollectionRepository {
  list(options: ListCollectionsOptions): Promise<{ data: CollectionWithRelations[]; nextCursor: string | null }>;
  findById(id: string): Promise<Collection | null>;
  create(data: { name: string; description: string; imageUrl?: string | null; stocks: number; price: number; closeDate?: Date | null; userId: string }): Promise<CollectionWithRelations>;
  update(id: string, data: Partial<{ name: string; description: string; imageUrl: string | null; stocks: number; price: number; closeDate: Date | null }>): Promise<CollectionWithRelations>;
  delete(id: string): Promise<void>;
}
