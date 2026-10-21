import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { ReportTable } from "@/components/domain/ReportTable";

interface RowData extends Record<string, unknown> {
  name: string;
  count: number;
}

const COLUMNS = [
  { key: "name" as const, header: "Nombre" },
  { key: "count" as const, header: "Cantidad" },
];

const ROWS: RowData[] = [
  { name: "Congreso A", count: 10 },
  { name: "Congreso B", count: 5 },
  { name: "Congreso C", count: 20 },
];

describe("ReportTable", () => {
  it("renders the correct number of data rows", () => {
    render(<ReportTable columns={COLUMNS} data={ROWS} />);
    const table = screen.getByTestId("report-table");
    const rows = table.querySelectorAll("tbody tr");
    expect(rows).toHaveLength(3);
  });

  it("renders all column headers", () => {
    render(<ReportTable columns={COLUMNS} data={ROWS} />);
    expect(screen.getByText("Nombre")).toBeInTheDocument();
    expect(screen.getByText("Cantidad")).toBeInTheDocument();
  });

  it("renders row cell values", () => {
    render(<ReportTable columns={COLUMNS} data={ROWS} />);
    expect(screen.getByText("Congreso A")).toBeInTheDocument();
    expect(screen.getByText("10")).toBeInTheDocument();
  });

  it("renders an empty state row when data is empty", () => {
    render(<ReportTable columns={COLUMNS} data={[]} />);
    expect(screen.getByText(/No hay datos disponibles/i)).toBeInTheDocument();
  });

  it("renders a caption when provided", () => {
    render(<ReportTable columns={COLUMNS} data={ROWS} caption="Reporte de congresos" />);
    expect(screen.getByText("Reporte de congresos")).toBeInTheDocument();
  });
});
