import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { ActivityBadge } from "@/components/domain/ActivityBadge";

describe("ActivityBadge", () => {
  it("renders PONENCIA label for type PONENCIA", () => {
    render(<ActivityBadge type="PONENCIA" />);
    expect(screen.getByText("Ponencia")).toBeInTheDocument();
  });

  it("renders TALLER label for type TALLER", () => {
    render(<ActivityBadge type="TALLER" />);
    expect(screen.getByText("Taller")).toBeInTheDocument();
  });

  it("applies primary background class to PONENCIA variant", () => {
    render(<ActivityBadge type="PONENCIA" />);
    const badge = screen.getByTestId("activity-badge-ponencia");
    expect(badge.className).toContain("bg-[var(--color-primary)]");
  });

  it("applies primary background class to TALLER variant", () => {
    render(<ActivityBadge type="TALLER" />);
    const badge = screen.getByTestId("activity-badge-taller");
    expect(badge.className).toContain("bg-[var(--color-primary)]");
  });

  it("renders with white text class on both variants", () => {
    const { rerender } = render(<ActivityBadge type="PONENCIA" />);
    expect(screen.getByTestId("activity-badge-ponencia").className).toContain("text-white");

    rerender(<ActivityBadge type="TALLER" />);
    expect(screen.getByTestId("activity-badge-taller").className).toContain("text-white");
  });
});
