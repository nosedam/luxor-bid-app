import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { BidItem } from "../../components/BidItem";

vi.mock("@workspace/ui/components/button", () => ({
  Button: ({ children, onClick, disabled }: React.ComponentProps<"button">) => (
    <button onClick={onClick} disabled={disabled}>
      {children}
    </button>
  ),
}));

const makeBid = (overrides: Partial<{
  id: string;
  price: number;
  status: "PENDING" | "ACCEPTED" | "REJECTED";
  userId: string;
  createdAt: string;
}> = {}) => ({
  id: overrides.id ?? "bid-1",
  price: overrides.price ?? 150,
  status: overrides.status ?? "PENDING" as const,
  userId: overrides.userId ?? "user-1",
  createdAt: overrides.createdAt ?? "2026-03-01T00:00:00.000Z",
  user: { id: overrides.userId ?? "user-1", name: "Alice" },
});

const defaultProps = {
  bid: makeBid(),
  sessionUserId: "user-1",
  isCollectionOwner: false,
  onEdit: vi.fn(),
  onDelete: vi.fn(),
  onAccept: vi.fn(),
  onReject: vi.fn(),
};

describe("BidItem", () => {
  describe("rendering", () => {
    it("displays the bid price and user name", () => {
      render(<BidItem {...defaultProps} />);
      expect(screen.getByText("$150.00")).toBeInTheDocument();
      expect(screen.getByText(/Alice/)).toBeInTheDocument();
    });

    it("shows accepted status label for ACCEPTED bids", () => {
      render(<BidItem {...defaultProps} bid={makeBid({ status: "ACCEPTED" })} />);
      expect(screen.getByText("(accepted)")).toBeInTheDocument();
    });

    it("shows rejected status label for REJECTED bids", () => {
      render(<BidItem {...defaultProps} bid={makeBid({ status: "REJECTED" })} />);
      expect(screen.getByText("(rejected)")).toBeInTheDocument();
    });

    it("does not show status label for PENDING bids", () => {
      render(<BidItem {...defaultProps} bid={makeBid({ status: "PENDING" })} />);
      expect(screen.queryByText("(pending)")).not.toBeInTheDocument();
    });

    it("displays the formatted creation date", () => {
      render(<BidItem {...defaultProps} />);
      // Date is rendered in locale format — just verify the year is present
      expect(screen.getByText(/2026/)).toBeInTheDocument();
    });
  });

  describe("bid owner actions", () => {
    it("shows Edit and Remove buttons for the bid owner with a PENDING bid", () => {
      render(<BidItem {...defaultProps} sessionUserId="user-1" bid={makeBid({ userId: "user-1", status: "PENDING" })} />);
      expect(screen.getByText("Edit")).toBeInTheDocument();
      expect(screen.getByText("Remove")).toBeInTheDocument();
    });

    it("hides Edit/Remove when the bid is ACCEPTED", () => {
      render(<BidItem {...defaultProps} bid={makeBid({ status: "ACCEPTED" })} />);
      expect(screen.queryByText("Edit")).not.toBeInTheDocument();
      expect(screen.queryByText("Remove")).not.toBeInTheDocument();
    });

    it("hides Edit/Remove when the bid is REJECTED", () => {
      render(<BidItem {...defaultProps} bid={makeBid({ status: "REJECTED" })} />);
      expect(screen.queryByText("Edit")).not.toBeInTheDocument();
      expect(screen.queryByText("Remove")).not.toBeInTheDocument();
    });

    it("hides Edit/Remove when user is not the bid owner", () => {
      render(<BidItem {...defaultProps} sessionUserId="other-user" />);
      expect(screen.queryByText("Edit")).not.toBeInTheDocument();
      expect(screen.queryByText("Remove")).not.toBeInTheDocument();
    });

    it("calls onEdit with the bid when Edit is clicked", async () => {
      const onEdit = vi.fn();
      const bid = makeBid();
      render(<BidItem {...defaultProps} bid={bid} onEdit={onEdit} />);
      await userEvent.click(screen.getByText("Edit"));
      expect(onEdit).toHaveBeenCalledWith(bid);
    });

    it("calls onDelete with bid id when Remove is clicked", async () => {
      const onDelete = vi.fn();
      render(<BidItem {...defaultProps} onDelete={onDelete} />);
      await userEvent.click(screen.getByText("Remove"));
      expect(onDelete).toHaveBeenCalledWith("bid-1");
    });
  });

  describe("collection owner actions", () => {
    it("shows Accept and Reject buttons for collection owner on a non-owned PENDING bid", () => {
      render(
        <BidItem
          {...defaultProps}
          sessionUserId="owner-1"
          isCollectionOwner={true}
          bid={makeBid({ userId: "user-1", status: "PENDING" })}
        />
      );
      expect(screen.getByText("Accept")).toBeInTheDocument();
      expect(screen.getByText("Reject")).toBeInTheDocument();
    });

    it("hides Accept/Reject when the bid belongs to the collection owner themselves", () => {
      render(
        <BidItem
          {...defaultProps}
          sessionUserId="owner-1"
          isCollectionOwner={true}
          bid={makeBid({ userId: "owner-1", status: "PENDING" })}
        />
      );
      expect(screen.queryByText("Accept")).not.toBeInTheDocument();
      expect(screen.queryByText("Reject")).not.toBeInTheDocument();
    });

    it("hides Accept/Reject when the bid is not PENDING", () => {
      render(
        <BidItem
          {...defaultProps}
          sessionUserId="owner-1"
          isCollectionOwner={true}
          bid={makeBid({ userId: "user-1", status: "ACCEPTED" })}
        />
      );
      expect(screen.queryByText("Accept")).not.toBeInTheDocument();
    });

    it("calls onAccept with bid id when Accept is clicked", async () => {
      const onAccept = vi.fn();
      render(
        <BidItem
          {...defaultProps}
          sessionUserId="owner-1"
          isCollectionOwner={true}
          bid={makeBid({ userId: "user-1" })}
          onAccept={onAccept}
        />
      );
      await userEvent.click(screen.getByText("Accept"));
      expect(onAccept).toHaveBeenCalledWith("bid-1");
    });

    it("calls onReject with bid id when Reject is clicked", async () => {
      const onReject = vi.fn();
      render(
        <BidItem
          {...defaultProps}
          sessionUserId="owner-1"
          isCollectionOwner={true}
          bid={makeBid({ userId: "user-1" })}
          onReject={onReject}
        />
      );
      await userEvent.click(screen.getByText("Reject"));
      expect(onReject).toHaveBeenCalledWith("bid-1");
    });
  });
});
