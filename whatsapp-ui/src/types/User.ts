export interface User {
  _id: string;
  username: string;
  email: string;
  profilePic?: string;
  online?: boolean;
  createdAt?: string;
  updatedAt?: string;
}
