import { type UserSearchResult } from './user-types.js';

export interface FriendRequestBody {
  userId: number;
}

export interface FriendRequestResponse {
  requestId: number;
  user: UserSearchResult;
  createdAt: string;
}
