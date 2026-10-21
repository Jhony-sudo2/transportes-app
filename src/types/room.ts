export interface Room {
  id: string;
  congressId: string;
  name: string;
  capacity: number | null;
  location: string | null;
  createdAt: string;
  updatedAt: string;
}
