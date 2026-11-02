export interface ExpenseCategory {
  categoryId: number;
  name: string;
  active: boolean;
}
export interface WorkshopLine {
  categoryId: number;
  lineType: "LABOR" | "PART";
  description: string;
  amount: number;
}
export interface WorkshopInput {
  busId: number;
  serviceDate: string;
  lines: WorkshopLine[];
}
export interface WorkshopService extends WorkshopInput {
  workshopServiceId: number;
  totalAmount: number;
}
