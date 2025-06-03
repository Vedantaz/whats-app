import type { User } from "./User";

export interface Message {
  _id: string;
  content: string;
  sender: User | string;
  chat: string;
  createdAt: string;
  updatedAt: string;
}
