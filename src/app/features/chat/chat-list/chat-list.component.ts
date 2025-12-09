// src/app/features/chat/chat-list/chat-list.component.ts
import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { ChatRoom } from '../../../core/models/user.models';
import { ChatService } from '../../../core/services/chat';
import { CreateRoomComponent } from "../create-room/create-room.component";
import { UserListComponent } from "../user-list/user-list.component";
import { CommonModule } from '@angular/common';
import { AuthService } from '../../../core/services/auth';

@Component({
  selector: 'app-chat-list',
  templateUrl: './chat-list.component.html',
  styleUrls: ['./chat-list.component.scss'],
  imports: [CreateRoomComponent, UserListComponent, CommonModule],
})
export class ChatListComponent implements OnInit {
  rooms: ChatRoom[] = [];
  loading = false;
  errorMessage = '';
  showCreateModal = false;
  showUserListModal = false; // NEW: for direct chat
  currentUserId: number | undefined;

  constructor(
    private chatService: ChatService,
    private router: Router,
    private authService: AuthService,
    private cdr: ChangeDetectorRef
  ) {
    this.currentUserId = this.authService.currentUserValue?.ID;
  }

  ngOnInit(): void {
    this.loadRooms();
  }

  loadRooms(): void {
    this.loading = true;
    this.errorMessage = '';
    
    this.chatService.getUserRooms().subscribe({
      next: (response) => {
        this.rooms = response.rooms || [];
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        this.errorMessage = 'Failed to load chat rooms';
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  openRoom(roomId: number): void {
    this.router.navigate(['/chat/room', roomId]);
  }

  openCreateModal(): void {
    this.showCreateModal = true;
  }

  closeCreateModal(): void {
    this.showCreateModal = false;
  }

  // NEW: Direct chat functionality
  openUserListModal(): void {
    this.showUserListModal = true;
  }

  closeUserListModal(): void {
    this.showUserListModal = false;
  }

  onRoomCreated(): void {
    this.closeCreateModal();
    this.loadRooms();
  }

  getLastMessageTime(room: ChatRoom): string {
    if (room.messages && room.messages.length > 0) {
      const lastMessage = room.messages[room.messages.length - 1];
      return this.formatDate(lastMessage.CreatedAt);
    }
    return this.formatDate(room.CreatedAt);
  }

  // NEW: Get room display name
  getRoomDisplayName(room: ChatRoom): string {
    if (room.is_group) {
      return room.name;
    }
    
    // For direct chats, show the other user's name
    const otherUser = room.members.find(m => m.ID !== this.currentUserId);
    return otherUser ? otherUser.name : 'Unknown User';
  }

  // NEW: Get room avatar initial
  getRoomAvatar(room: ChatRoom): string {
    return this.getRoomDisplayName(room).charAt(0).toUpperCase();
  }

  private formatDate(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    
    return date.toLocaleDateString();
  }
}