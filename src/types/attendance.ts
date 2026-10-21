export interface Attendance {
  id: string;
  activityId: string;
  personalId: string;
  registeredBy: string;
  registeredAt: string;
}

export interface AttendanceRegistration {
  activityId: string;
  personalId: string;
}
