import { type UserSearchResult } from './user-types.js';

export interface FriendshipResponse {
  friendshipId: number;
  user: UserSearchResult;
  createdAt: string;
}
