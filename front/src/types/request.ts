export interface Request {
  id: number;
  studentName: string;
  telegram?: string;
  university?: string;
  course?: string;
  projectId?: number;
  projectTitle?: string;
  eventId?: number;
  specialization?: string;
  about?: string;
  status?: string;
  ownerId?: number;
  createdAt?: string;
}