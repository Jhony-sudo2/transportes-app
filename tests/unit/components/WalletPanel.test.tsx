import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";
import { WalletPanel } from "@/components/domain/WalletPanel";
import type { Wallet } from "@/types/wallet";

const MOCK_WALLET: Wallet = {
  userId: "11111111-0000-0000-0000-000000000001",
  balance: 250.75,
};

describe("WalletPanel", () => {
  it("renders the formatted balance", () => {
    render(<WalletPanel wallet={MOCK_WALLET} />);
    const balanceEl = screen.getByTestId("wallet-balance");
    expect(balanceEl.textContent).toMatch(/250|Q/);
  });

  it("renders zero balance when wallet is null", () => {
    render(<WalletPanel wallet={null} />);
    const balanceEl = screen.getByTestId("wallet-balance");
    expect(balanceEl.textContent).toMatch(/0/);
  });

  it("renders top-up button when onTopUp is provided", () => {
    render(<WalletPanel wallet={MOCK_WALLET} onTopUp={vi.fn()} />);
    expect(screen.getByTestId("wallet-top-up-button")).toBeInTheDocument();
  });

  it("calls onTopUp when top-up button is clicked", async () => {
    const onTopUp = vi.fn();
    render(<WalletPanel wallet={MOCK_WALLET} onTopUp={onTopUp} />);
    await userEvent.click(screen.getByTestId("wallet-top-up-button"));
    expect(onTopUp).toHaveBeenCalledOnce();
  });

  it("does not render top-up button when onTopUp is not provided", () => {
    render(<WalletPanel wallet={MOCK_WALLET} />);
    expect(screen.queryByTestId("wallet-top-up-button")).not.toBeInTheDocument();
  });
});
