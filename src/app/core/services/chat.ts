// src/app/core/services/chat.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environments';
import { ChatRoom, CreateRoomRequest, Message, SendMessageRequest, User, CreateDirectChatRequest } from '../models/user.models';

@Injectable({
  providedIn: 'root'
})
export class ChatService {
  private apiUrl = `${environment.apiUrl}/chat`;
  private userApiUrl = `${environment.apiUrl}/users`;

  constructor(private http: HttpClient) {}

  // Room operations
  createRoom(data: CreateRoomRequest): Observable<{ message: string; room: ChatRoom }> {
    const url = `${this.apiUrl}/rooms`;
    return this.http.post<{ message: string; room: ChatRoom }>(url, data);
  }

  // NEW: Create direct chat with a user
  createDirectChat(data: CreateDirectChatRequest): Observable<{ message: string; room: ChatRoom }> {
    const url = `${this.apiUrl}/direct`;
    return this.http.post<{ message: string; room: ChatRoom }>(url, data);
  }

  getUserRooms(): Observable<{ rooms: ChatRoom[] }> {
    const url = `${this.apiUrl}/rooms`;
    return this.http.get<{ rooms: ChatRoom[] }>(url);
  }

  getRoomById(roomId: number): Observable<{ room: ChatRoom }> {
    const url = `${this.apiUrl}/rooms/${roomId}`;
    return this.http.get<{ room: ChatRoom }>(url);
  }

  addMemberToRoom(roomId: number, userId: number): Observable<{ message: string }> {
    const url = `${this.apiUrl}/rooms/${roomId}/members`;
    return this.http.post<{ message: string }>(url, { user_id: userId });
  }

  // NEW: Remove member from room
  removeMemberFromRoom(roomId: number, userId: number): Observable<{ message: string }> {
    const url = `${this.apiUrl}/rooms/${roomId}/members/${userId}`;
    return this.http.delete<{ message: string }>(url);
  }

  // Message operations
  getRoomMessages(roomId: number, limit: number = 50, offset: number = 0): Observable<{ messages: Message[] }> {
    const url = `${this.apiUrl}/rooms/${roomId}/messages`;
    const params = new HttpParams()
      .set('limit', limit)
      .set('offset', offset);
    return this.http.get<{ messages: Message[] }>(url, { params });
  }

  sendMessage(roomId: number, data: SendMessageRequest): Observable<{ message: string; data: Message }> {
    const url = `${this.apiUrl}/rooms/${roomId}/messages`;
    return this.http.post<{ message: string; data: Message }>(url, data);
  }

  markMessageAsRead(messageId: number): Observable<{ message: string }> {
    const url = `${this.apiUrl}/messages/${messageId}/read`;
    return this.http.put<{ message: string }>(url, {});
  }

  // NEW: User search and listing
  getAllUsers(search?: string): Observable<{ users: User[] }> {
    const url = `${this.userApiUrl}`;
    let params = new HttpParams();
    if (search) {
      params = params.set('search', search);
    }
    return this.http.get<{ users: User[] }>(url, { params });
  }

  searchUsers(query: string): Observable<{ users: User[] }> {
    return this.getAllUsers(query);
  }
  // Check if a room is a direct chat (2 members, type === 'direct')
isDirectChat(room: ChatRoom): boolean {
  return room.is_group === false || (room.members && room.members.length === 2);
}

// Get name of the other user in a direct chat
getDirectChatName(room: ChatRoom, currentUserId: number): string {
  if (!room || !room.members) return 'Unknown';

  const otherUser = room.members.find(m => m.ID !== currentUserId);
  return otherUser?.name ? otherUser?.name : 'Direct Chat';
}

}