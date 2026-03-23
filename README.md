# Luxor App

A full-stack NFT/collectibles marketplace built with Next.js, Prisma, and PostgreSQL. Users can list collections, place bids, and manage auction-style transactions.

## Tech Stack

- **Frontend/Backend**: Next.js 16 (App Router, API Routes)
- **Database**: PostgreSQL 16 via Prisma ORM
- **Auth**: JWT (via `jose`) with HTTP-only cookies
- **Storage**: AWS S3 (image uploads)
- **Monorepo**: Turborepo + pnpm workspaces
- **Containerization**: Docker + Docker Compose

---

## Prerequisites

- [Node.js](https://nodejs.org/) >= 20
- [pnpm](https://pnpm.io/) 9.15.9 (`npm install -g pnpm@9.15.9`)
- [Docker](https://www.docker.com/) & Docker Compose

---

## Running with Docker (recommended)

### 1. Create the environment file

```bash
cp apps/web/.env.example apps/web/.env
```

Edit `apps/web/.env` and fill in the required values:

```env
DATABASE_URL=postgresql://luxor:luxor@localhost:5432/luxor
JWT_SECRET=your-secret-here

# AWS S3 (for image uploads)
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_REGION=
AWS_BUCKET_NAME=
```

### 2. Start the services

```bash
docker compose up --build
```

This will:
- Start a PostgreSQL 16 database
- Build and start the Next.js app on port `3000`
- Automatically run Prisma migrations on startup

The app will be available at http://localhost:3000.

### 3. Seed the database (optional, run separately)

In a separate terminal, after the containers are running:

```bash
pnpm db:seed
```

This populates the database with sample users, collections, and bids.

---

## Running Locally (without Docker)

### 1. Install dependencies

```bash
pnpm install
```

### 2. Start PostgreSQL

Make sure a PostgreSQL instance is running and update `DATABASE_URL` in `apps/web/.env` accordingly.

### 3. Run migrations

```bash
pnpm db:migrate
```

### 4. Seed the database (optional, run separately)

```bash
pnpm db:seed
```

### 5. Start the development server

```bash
pnpm dev
```

The app will be available at http://localhost:3000.

---

## Other Useful Commands

| Command | Description |
|---|---|
| `pnpm build` | Build all packages and apps |
| `pnpm lint` | Run ESLint across the monorepo |
| `pnpm typecheck` | Run TypeScript checks across the monorepo |
| `pnpm db:generate` | Regenerate Prisma client after schema changes |
| `pnpm db:push` | Push schema changes to the DB without a migration file |

---

## Folder Structure

```
luxor-app/
├── apps/
│   └── web/                        # Next.js application
│       ├── app/
│       │   ├── api/
│       │   │   ├── adapters/       # HTTP layer — Next.js route handlers
│       │   │   │   ├── auth/       #   POST /api/adapters/auth/login|logout|register|refresh
│       │   │   │   ├── bids/       #   GET|POST /api/adapters/bids, accept/reject by ID
│       │   │   │   └── collections/#   GET|POST /api/adapters/collections, upload
│       │   │   ├── core/           # Business logic (framework-agnostic)
│       │   │   │   ├── domain/     #   TypeScript types: User, Collection, Bid, Errors
│       │   │   │   ├── ports/      #   Repository interfaces (abstractions)
│       │   │   │   └── services/   #   Application services: auth, bid, collection
│       │   │   └── db/             # Prisma repository implementations
│       │   ├── layout.tsx          # Root layout
│       │   └── page.tsx            # Home page
│       ├── components/             # React UI components
│       │   ├── AllCollections.tsx
│       │   ├── MyCollections.tsx
│       │   ├── CollectionCard.tsx
│       │   ├── BidModal.tsx
│       │   ├── BidItem.tsx
│       │   └── LoginModal.tsx
│       └── lib/
│           ├── auth.ts             # JWT helpers
│           ├── fetchWithAuth.ts    # Fetch wrapper with token refresh
│           └── types.ts            # Shared frontend types
│
├── packages/
│   ├── db/                         # Shared database package
│   │   ├── prisma/
│   │   │   ├── schema.prisma       # Database schema (User, Collection, Bid)
│   │   │   ├── seed.ts             # Seed script
│   │   │   └── migrations/         # Migration history
│   │   └── src/index.ts            # Prisma client export
│   ├── ui/                         # Shared component library (shadcn/ui)
│   ├── eslint-config/              # Shared ESLint configuration
│   └── typescript-config/          # Shared TypeScript configuration
│
├── Dockerfile                      # Multi-stage production build
├── docker-compose.yml              # PostgreSQL + web service
├── entrypoint.sh                   # Runs migrations then starts Next.js
└── turbo.json                      # Turborepo pipeline configuration
```

### Architecture Note

The API follows a ports-and-adapters (hexagonal) pattern:

- **`adapters/`** — HTTP boundary: parses requests, calls services, returns responses
- **`core/services/`** — Pure business logic with no framework dependencies
- **`core/ports/`** — Repository interfaces that the services depend on
- **`db/`** — Concrete Prisma implementations of those interfaces
