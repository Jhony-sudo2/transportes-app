export type DiplomaType = "PARTICIPATION" | "LEADERSHIP";

export interface Diploma {
  id: string;
  userId: string;
  congressId: string;
  type: DiplomaType;
  activityId: string | null;
  issuedAt: string;
}
