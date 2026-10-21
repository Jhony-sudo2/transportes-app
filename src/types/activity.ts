export type ActivityType = "PONENCIA" | "TALLER";

export interface Activity {
  id: string;
  congressId: string;
  roomId: string;
  name: string;
  description: string;
  type: ActivityType;
  startTime: string;
  endTime: string;
  leaders: string[];
  workshopCapacity: number | null;
  createdAt: string;
  updatedAt: string;
}
