export interface User {
  id: number;
  email: string;
  name: string;
  surname: string;
  role: "student" | "organizer" | string;
  password?: string;
}