// src/app/core/models/user.models.ts

export interface User {
  ID: number;
  username?: string;
  name: string;
  email: string;
  is_online?: boolean;        // NEW
  last_seen_at?: string;      // NEW
  CreatedAt?: string;
  UpdatedAt?: string;
}
export interface AuthResponse {
  message: string;
  token: string;
  user: User;
}

export interface ChatRoom {
  ID: number;
  name: string;
  description?: string;
  is_group: boolean; // NEW: indicates if it's a group chat or direct chat
  creator_id: number;
  members: User[];
  messages?: Message[];
  CreatedAt: string;
  UpdatedAt: string;
}

export interface Message {
  ID: number;
  room_id: number;
  sender_id: number;
  sender?: User | null;
  content: string;
  is_read: boolean;
  CreatedAt: string;
  UpdatedAt: string;
}

export interface CreateRoomRequest {
  name: string;
  description?: string;
  member_ids: number[];
  is_group?: boolean; // NEW: optional, defaults to true
}

export interface SendMessageRequest {
  content: string;
}

export interface WebSocketMessage {
  type: string;
  content?: string;
  room_id?: number;
  message?: Message;
  error?: string;
  userId?: number; // NEW: user who is typing
  username?: string; // NEW: username of typing user
  typing?: boolean; // NEW: is user typing
}

// NEW: Interface for direct chat creation
export interface CreateDirectChatRequest {
  user_id: number;
}