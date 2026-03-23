import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const SALT_ROUNDS = 10;

function randomBetween(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomFloat(min: number, max: number): number {
  return parseFloat((Math.random() * (max - min) + min).toFixed(2));
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const COLLECTION_NAMES = [
  // Ape / animal memes
  "Drowsy Ape Fishing Club", "Mutant Hamster Society", "Bored Lizard Gang",
  "Sleepy Frog Militia", "Angry Penguin Syndicate", "Caffeinated Raccoon Crew",
  "Grumpy Capybara DAO", "Anxious Axolotl Army", "Soggy Duck Republic",
  "Feral Corgi Collective", "Deranged Platypus Club", "Screaming Goat Society",
  // Pixel / generative
  "Blurry Pixel Freaks", "Glitched Skeleton Keys", "Procedural Nightmares",
  "8-Bit Void Walkers", "Corrupted Sprite Index", "Low-Res Deity Pack",
  "Invisible Jpeg Society", "404 Trait Not Found", "Broken Metadata Club",
  "Compressed Soul Series", "Zero Rarity Legends", "Randomized Regrets",
  // Crypto culture in-jokes
  "Wen Lambo Waitlist", "Ngmi Holders Pass", "Probably Nothing Genesis",
  "Few Understand Edition", "Down Only Collection", "Ser Wen Reveal",
  "Touch Grass Certificate", "Paper Hands Memorial", "Diamond Hands Diploma",
  "Rug Survivors Badge", "Buy The Dip Believers", "This Is Fine Pass",
  "Floor Is Lava Club", "Gm Gm Gm Series", "Have Fun Staying Poor",
  "Liquidity Pool Party", "Gas Fee Victims Fund", "Anon Dev Appreciation",
  // Degen / meme vibes
  "Sigma Goblin Order", "Gigabrain Toad Cartel", "Based Rat Uprising",
  "Chad Wojak Warriors", "Doomer Bear Market", "Meme Lord Metaverse Pass",
  "Pepe Descendant Archive", "Rare Doge Relics", "Shitcoin Graveyard",
  "Moon Math Disciples", "Alpha Leak Holders", "Cope & Seethe Genesis",
  "Unverified Smart Apes", "Exit Liquidity Club", "Ponzi Pyramid Pals",
  // Absurd / surreal
  "Sentient Toaster Punks", "Haunted Wi-Fi Spirits", "NFT of an NFT",
  "Right-Click Save Legends", "Screenshotted Originals", "Blockchain Brain Worms",
  "Decentralized Cringe DAO", "Overpriced JPEG Alliance", "Utility Coming Soon Club",
  "Roadmap Not Included", "Whitepaper Redacted", "Mint Was a Mistake",
  // Fantasy / sci-fi flavoured
  "Void Gazers Consortium", "Neon Skull Prophecy", "Cyber Shaman Circle",
  "Dark Pool Ghosts", "Encrypted Specter Guild", "Quantum Degen Protocol",
  "Hash Rate Necromancers", "Cold Wallet Phantoms", "Merkle Tree Monks",
  "Zero Knowledge Cultists", "Fork Me Wizards", "Proof of Vibe Chain",
  // Misc
  "Derivative #9001", "Floor Sweeper Special", "Wash Trade Winners",
  "Airdrop Farmers United", "Shill Squad Genesis", "Fomo Wave Riders",
];

const DESCRIPTIONS = [
  "A curated selection of rare and unique pieces from independent artists worldwide.",
  "Handpicked items that blend modern aesthetics with timeless craftsmanship.",
  "An exclusive collection celebrating the intersection of art and technology.",
  "Limited edition works that push the boundaries of contemporary expression.",
  "Sourced from emerging creators redefining their medium.",
  "A thoughtfully assembled portfolio of investment-grade collectibles.",
  "Pieces that tell stories across cultures and generations.",
  "Bold, experimental works from the underground art scene.",
  "Archival quality prints and originals from celebrated studios.",
  "A diverse mix of styles united by exceptional quality and vision.",
];

async function main() {
  console.log("Cleaning existing seed data...");
  await prisma.bid.deleteMany({});
  await prisma.collection.deleteMany({});
  await prisma.user.deleteMany({});

  // ── Users ──────────────────────────────────────────────────────────────────
  console.log("Creating users...");
  const hashedPassword = await bcrypt.hash("guest123", SALT_ROUNDS);

  // 10 named guest users
  const guestUsers = await Promise.all(
    Array.from({ length: 10 }, (_, i) => {
      const n = i + 1;
      return prisma.user.create({
        data: {
          name: `guest${n}`,
          email: `guest${n}@luxor.dev`,
          password: hashedPassword,
        },
      });
    })
  );

  // 20 extra users so we can reach up to 25 bids/collection (unique per user)
  const extraUsers = await Promise.all(
    Array.from({ length: 20 }, (_, i) => {
      const n = i + 1;
      return prisma.user.create({
        data: {
          name: `bidder${n}`,
          email: `bidder${n}@luxor.dev`,
          password: hashedPassword,
        },
      });
    })
  );

  const allUsers = [...guestUsers, ...extraUsers];
  console.log(`  Created ${allUsers.length} users (10 guests + 20 bidders)`);

  // ── Collections ────────────────────────────────────────────────────────────
  console.log("Creating 100 collections...");
  const collections = await Promise.all(
    Array.from({ length: 100 }, (_, i) =>
      prisma.collection.create({
        data: {
          name: COLLECTION_NAMES[i] ?? `Collection #${i + 1}`,
          description: pickRandom(DESCRIPTIONS),
          stocks: randomBetween(5, 50),
          price: randomFloat(1, 30),
          userId: pickRandom(allUsers).id,
        },
      })
    )
  );
  console.log(`  Created ${collections.length} collections`);

  // ── Bids ───────────────────────────────────────────────────────────────────
  console.log("Creating bids (10–25 per collection)...");
  let totalBids = 0;

  for (const collection of collections) {
    const bidCount = randomBetween(10, 25);
    // Exclude the collection owner to mirror realistic bidding behaviour,
    // then shuffle and take the first `bidCount` users.
    const eligibleBidders = shuffle(
      allUsers.filter((u) => u.id !== collection.userId)
    ).slice(0, bidCount);

    await Promise.all(
      eligibleBidders.map((user) =>
        prisma.bid.create({
          data: {
            collectionId: collection.id,
            userId: user.id,
            // Bids are at or above the collection's minimum price
            price: randomFloat(collection.price, collection.price * 3),
            status: "PENDING",
          },
        })
      )
    );

    totalBids += eligibleBidders.length;
  }

  console.log(`  Created ${totalBids} bids`);
  console.log("\nSeed complete!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
