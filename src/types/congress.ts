import type { Activity } from "./activity";

export interface CongressSummary {
  id: string;
  name: string;
  description: string;
  startDate: string;
  endDate: string;
  location: string;
  price: number;
  institutionId: string;
  institutionName: string;
  createdAt: string;
}

export interface Congress extends CongressSummary {
  createdBy: string;
  updatedAt: string;
}

export interface CongressDetail extends Congress {
  activities: Activity[];
}
