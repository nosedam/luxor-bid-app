/**
 * Finds all RUNNING collections whose closeDate is today or in the past,
 * then automatically accepts the highest PENDING bid on each.
 * Collections with no bids are marked COMPLETED with no accepted bid.
 *
 * Run via: pnpm --filter @workspace/db close-collections
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const now = new Date();
  const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

  const collections = await prisma.collection.findMany({
    where: {
      status: "RUNNING",
      deletedAt: null,
      closeDate: { lte: endOfDay },
    },
    select: { id: true, name: true },
  });

  if (collections.length === 0) {
    console.log("No collections closing today.");
    return;
  }

  console.log(`Found ${collections.length} collection(s) to close.`);

  for (const collection of collections) {
    const topBid = await prisma.bid.findFirst({
      where: { collectionId: collection.id, status: "PENDING", deletedAt: null },
      orderBy: { price: "desc" },
      select: { id: true, price: true },
    });

    if (!topBid) {
      await prisma.collection.update({
        where: { id: collection.id },
        data: { status: "COMPLETED" },
      });
      console.log(`Collection "${collection.name}" closed with no bids.`);
      continue;
    }

    await prisma.$transaction([
      prisma.bid.update({ where: { id: topBid.id }, data: { status: "ACCEPTED" } }),
      prisma.bid.updateMany({
        where: { collectionId: collection.id, id: { not: topBid.id }, deletedAt: null },
        data: { status: "REJECTED" },
      }),
      prisma.collection.update({ where: { id: collection.id }, data: { status: "COMPLETED" } }),
    ]);

    console.log(`Collection "${collection.name}" closed — accepted bid $${topBid.price.toFixed(2)}.`);
  }
}

main()
  .catch((err) => { console.error(err); process.exit(1); })
  .finally(() => prisma.$disconnect());
