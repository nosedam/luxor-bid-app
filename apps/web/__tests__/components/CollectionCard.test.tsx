import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CollectionCard } from "../../components/CollectionCard";

vi.mock("@workspace/ui/components/button", () => ({
  Button: ({ children, onClick, disabled }: React.ComponentProps<"button">) => (
    <button onClick={onClick} disabled={disabled}>
      {children}
    </button>
  ),
}));

vi.mock("lucide-react", () => ({
  ChevronDown: () => <span data-testid="chevron-down" />,
  ChevronUp: () => <span data-testid="chevron-up" />,
  Pencil: () => <span data-testid="pencil" />,
}));

vi.mock("@/lib/fetchWithAuth", () => ({
  fetchWithAuth: vi.fn(),
}));

const makeCollection = (overrides: Partial<{
  id: string;
  name: string;
  description: string;
  imageUrl: string | null;
  stocks: number;
  price: number;
  userId: string;
  status: "RUNNING" | "COMPLETED";
  closeDate: string | null;
  myBid: { id: string; price: number; status: "PENDING" | "ACCEPTED" | "REJECTED" } | null;
  maxBid: number | null;
}> = {}) => ({
  id: overrides.id ?? "col-1",
  name: overrides.name ?? "Cool NFT",
  description: overrides.description ?? "A cool collection",
  imageUrl: overrides.imageUrl ?? null,
  stocks: overrides.stocks ?? 10,
  price: overrides.price ?? 100,
  userId: overrides.userId ?? "owner-1",
  status: overrides.status ?? "RUNNING" as const,
  closeDate: overrides.closeDate ?? null,
  user: { id: "owner-1", name: "Owner" },
  _count: { bids: 3 },
  maxBid: overrides.maxBid ?? null,
  myBid: overrides.myBid ?? null,
});

const mockFetchEmptyBids = () => {
  global.fetch = vi.fn().mockResolvedValue({
    json: () => Promise.resolve({ data: [], total: 0, page: 1, totalPages: 1 }),
  } as unknown as Response);
};

const defaultProps = {
  collection: makeCollection(),
  sessionUserId: "user-1",
  isExpanded: false,
  onToggle: vi.fn(),
  onBid: vi.fn(),
  onRefresh: vi.fn(),
  onEdit: vi.fn(),
};

describe("CollectionCard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetchEmptyBids();
  });

  describe("rendering", () => {
    it("displays collection name and description", () => {
      render(<CollectionCard {...defaultProps} />);
      expect(screen.getByText("Cool NFT")).toBeInTheDocument();
      expect(screen.getByText("A cool collection")).toBeInTheDocument();
    });

    it("displays price, units count, and bid count", () => {
      render(<CollectionCard {...defaultProps} />);
      expect(screen.getByText("$100.00")).toBeInTheDocument();
      expect(screen.getByText("10 units")).toBeInTheDocument();
      expect(screen.getByText("3 bids")).toBeInTheDocument();
    });

    it("shows collection image when imageUrl is provided", () => {
      render(<CollectionCard {...defaultProps} collection={makeCollection({ imageUrl: "https://img.test/nft.png" })} />);
      expect(screen.getByRole("img", { name: "Cool NFT" })).toBeInTheDocument();
    });

    it("shows placeholder when no image is provided", () => {
      render(<CollectionCard {...defaultProps} />);
      expect(screen.getByText(/No NFT Image Uploaded/)).toBeInTheDocument();
    });

    it("shows Completed badge for COMPLETED collections", () => {
      render(<CollectionCard {...defaultProps} collection={makeCollection({ status: "COMPLETED" })} />);
      expect(screen.getByText("Completed")).toBeInTheDocument();
    });

    it("hides Completed badge for RUNNING collections", () => {
      render(<CollectionCard {...defaultProps} />);
      expect(screen.queryByText("Completed")).not.toBeInTheDocument();
    });

    it("shows close date for RUNNING collections with a closeDate", () => {
      render(<CollectionCard {...defaultProps} collection={makeCollection({ closeDate: "2026-12-31T00:00:00.000Z" })} />);
      expect(screen.getByText(/closes/)).toBeInTheDocument();
    });

    it("hides close date for COMPLETED collections", () => {
      render(
        <CollectionCard
          {...defaultProps}
          collection={makeCollection({ status: "COMPLETED", closeDate: "2026-12-31T00:00:00.000Z" })}
        />
      );
      expect(screen.queryByText(/closes/)).not.toBeInTheDocument();
    });

    it("shows top bid when maxBid is provided", () => {
      render(<CollectionCard {...defaultProps} collection={makeCollection({ maxBid: 250 })} />);
      expect(screen.getByText("top $250.00")).toBeInTheDocument();
    });
  });

  describe("my bid badge", () => {
    it("shows PENDING bid badge in amber color", () => {
      const collection = makeCollection({ myBid: { id: "bid-1", price: 120, status: "PENDING" } });
      const { container } = render(<CollectionCard {...defaultProps} collection={collection} />);
      const badge = screen.getByText("my bid $120.00");
      expect(badge).toBeInTheDocument();
      expect(badge.className).toContain("amber");
    });

    it("shows ACCEPTED bid badge in green color", () => {
      const collection = makeCollection({ myBid: { id: "bid-1", price: 120, status: "ACCEPTED" } });
      render(<CollectionCard {...defaultProps} collection={collection} />);
      const badge = screen.getByText("my bid $120.00");
      expect(badge.className).toContain("green");
    });

    it("shows REJECTED bid badge in red color", () => {
      const collection = makeCollection({ myBid: { id: "bid-1", price: 120, status: "REJECTED" } });
      render(<CollectionCard {...defaultProps} collection={collection} />);
      const badge = screen.getByText("my bid $120.00");
      expect(badge.className).toContain("red");
    });

    it("applies amber border for PENDING bid", () => {
      const collection = makeCollection({ myBid: { id: "bid-1", price: 120, status: "PENDING" } });
      const { container } = render(<CollectionCard {...defaultProps} collection={collection} />);
      expect(container.firstChild).toHaveClass("border-amber-400");
    });

    it("applies green border for ACCEPTED bid", () => {
      const collection = makeCollection({ myBid: { id: "bid-1", price: 120, status: "ACCEPTED" } });
      const { container } = render(<CollectionCard {...defaultProps} collection={collection} />);
      expect(container.firstChild).toHaveClass("border-green-500");
    });

    it("applies red border for REJECTED bid", () => {
      const collection = makeCollection({ myBid: { id: "bid-1", price: 120, status: "REJECTED" } });
      const { container } = render(<CollectionCard {...defaultProps} collection={collection} />);
      expect(container.firstChild).toHaveClass("border-red-500");
    });
  });

  describe("owner controls", () => {
    it("shows edit button when user is the collection owner", () => {
      render(<CollectionCard {...defaultProps} sessionUserId="owner-1" />);
      expect(screen.getByTestId("pencil")).toBeInTheDocument();
    });

    it("hides edit button when user is not the collection owner", () => {
      render(<CollectionCard {...defaultProps} sessionUserId="user-1" />);
      expect(screen.queryByTestId("pencil")).not.toBeInTheDocument();
    });

    it("calls onEdit when edit button is clicked", async () => {
      const onEdit = vi.fn();
      render(<CollectionCard {...defaultProps} sessionUserId="owner-1" onEdit={onEdit} />);
      const editBtn = screen.getByRole("button", { name: "" }); // the span with role=button
      // Click the pencil button (it's a span with role=button)
      const pencilBtn = screen.getByTestId("pencil").parentElement!;
      await userEvent.click(pencilBtn);
      expect(onEdit).toHaveBeenCalled();
    });
  });

  describe("expand / collapse", () => {
    it("shows chevron-down when collapsed", () => {
      render(<CollectionCard {...defaultProps} isExpanded={false} />);
      expect(screen.getByTestId("chevron-down")).toBeInTheDocument();
    });

    it("shows chevron-up when expanded", () => {
      render(<CollectionCard {...defaultProps} isExpanded={true} />);
      expect(screen.getByTestId("chevron-up")).toBeInTheDocument();
    });

    it("shows bids section when expanded", async () => {
      render(<CollectionCard {...defaultProps} isExpanded={true} />);
      await waitFor(() => {
        expect(screen.getByText("No bids yet.")).toBeInTheDocument();
      });
    });

    it("fetches bids and calls onToggle when card header is clicked while collapsed", async () => {
      const onToggle = vi.fn();
      render(<CollectionCard {...defaultProps} isExpanded={false} onToggle={onToggle} />);
      await userEvent.click(screen.getByRole("button", { name: /Cool NFT/ }));
      await waitFor(() => expect(onToggle).toHaveBeenCalled());
    });

    it("shows Bid button for non-owner logged-in users when expanded and no existing bid", async () => {
      render(
        <CollectionCard
          {...defaultProps}
          isExpanded={true}
          sessionUserId="user-1"
          collection={makeCollection({ userId: "owner-1" })}
        />
      );
      await waitFor(() => {
        expect(screen.getByText("Bid")).toBeInTheDocument();
      });
    });

    it("hides Bid button for the collection owner", async () => {
      render(
        <CollectionCard
          {...defaultProps}
          isExpanded={true}
          sessionUserId="owner-1"
          collection={makeCollection({ userId: "owner-1" })}
        />
      );
      await waitFor(() => {
        expect(screen.queryByText("Bid")).not.toBeInTheDocument();
      });
    });
  });
});
