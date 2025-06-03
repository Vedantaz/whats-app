import { type User } from "./User";
import { type Message } from "./Message";

export interface Chat {
  _id: string;
  users: User[];
  lastMessage?: Message;
  createdAt: string;
  updatedAt: string;
}
