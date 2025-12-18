export interface Specialization {
  id: number;
  title: string;
}

export interface Event {
  id: number;
  title?: string;
  description?: string;
  startDate?: string;
  endDate?: string;
  applyDeadline?: string;
  leader?: string;
  organizer?: string;
  specializations?: Specialization[];
  status?: string;
}