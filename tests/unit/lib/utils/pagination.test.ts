import { describe, it, expect } from "vitest";
import { buildPaginationParams } from "@/lib/utils/pagination";

describe("buildPaginationParams", () => {
  it("builds params with page=0 and size=20 (defaults)", () => {
    const params = buildPaginationParams(0, 20);
    expect(params.get("page")).toBe("0");
    expect(params.get("size")).toBe("20");
  });

  it("builds params with custom page and size", () => {
    const params = buildPaginationParams(3, 50);
    expect(params.get("page")).toBe("3");
    expect(params.get("size")).toBe("50");
  });

  it("returns a URLSearchParams instance", () => {
    expect(buildPaginationParams(0, 10)).toBeInstanceOf(URLSearchParams);
  });

  it("produces a valid query string", () => {
    const params = buildPaginationParams(2, 25);
    const qs = params.toString();
    expect(qs).toContain("page=2");
    expect(qs).toContain("size=25");
  });

  it("handles page=0 (first page)", () => {
    const params = buildPaginationParams(0, 20);
    expect(params.get("page")).toBe("0");
  });

  it("handles large page numbers", () => {
    const params = buildPaginationParams(999, 100);
    expect(params.get("page")).toBe("999");
    expect(params.get("size")).toBe("100");
  });

  it("converts numbers to strings in the output", () => {
    const params = buildPaginationParams(1, 10);
    // URLSearchParams always stores strings
    expect(typeof params.get("page")).toBe("string");
    expect(typeof params.get("size")).toBe("string");
  });

  it("result contains exactly the two expected keys", () => {
    const params = buildPaginationParams(0, 20);
    const keys = [...params.keys()];
    expect(keys).toHaveLength(2);
    expect(keys).toContain("page");
    expect(keys).toContain("size");
  });
});
