import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription, interval } from 'rxjs';

import { ChatRoom, User } from '../../../core/models/user.models';
import { ChatService } from '../../../core/services/chat';
import { AuthService } from '../../../core/services/auth';
import { PresenceService } from '../../../core/services/presence';
import { CreateRoomComponent } from "../create-room/create-room.component";

@Component({
  selector: 'app-chat-list',
  templateUrl: './chat-list.component.html',
  styleUrls: ['./chat-list.component.scss'],
  imports: [CreateRoomComponent]
})
export class ChatListComponent implements OnInit, OnDestroy {
  rooms: ChatRoom[] = [];
  loading = false;
  errorMessage = '';
  showCreateModal = false;
  showUserListModal = false;
  currentUserId: number;
  users: User[] = [];
  loadingUsers = false;
  private statusCheckSubscription?: Subscription;

  constructor(
    private chatService: ChatService,
    private authService: AuthService,
    private presenceService: PresenceService,
    private router: Router,
    private cdr: ChangeDetectorRef

  ) {
    this.currentUserId = this.authService.currentUserValue?.ID || 0;
  }

  ngOnInit(): void {
    this.loadRooms();
    this.startStatusPolling();
  }

  ngOnDestroy(): void {
    if (this.statusCheckSubscription) {
      this.statusCheckSubscription.unsubscribe();
    }
  }

  startStatusPolling(): void {
    // Check online status every 30 seconds
    this.statusCheckSubscription = interval(150000).subscribe(() => {
      this.updateOnlineStatus();
    });
  }

  updateOnlineStatus(): void {
    // Get all user IDs from rooms
    const userIds = new Set<number>();
    this.rooms.forEach(room => {
      room.members.forEach(member => {
        if (member.ID !== this.currentUserId) {
          userIds.add(member.ID);
        }
      });
    });

    if (userIds.size > 0) {
      this.presenceService.getOnlineStatus(Array.from(userIds)).subscribe({
        next: (response) => {
          Object.entries(response.online_status).forEach(([userId, isOnline]) => {
            this.presenceService.updateOnlineStatus(Number(userId), isOnline);
          });
        },
        error: (err) => console.error('Error checking online status:', err)
      });
    }
  }

  loadRooms(): void {
    this.loading = true;
    this.chatService.getUserRooms().subscribe({
      next: (response) => {
        this.rooms = response.rooms || [];
        this.loading = false;
        this.updateOnlineStatus();
        this.cdr.detectChanges();
      },
      error: (error) => {
        this.errorMessage = 'Failed to load chat rooms';
        this.loading = false;
        this.cdr.detectChanges();
        console.error('Error loading rooms:', error);
      }
    });
  }

  loadUsers(): void {
    this.loadingUsers = true;
    this.chatService.getAllUsers().subscribe({
      next: (response) => {
        this.users = (response.users || []).filter(u => u.ID !== this.currentUserId);
        this.loadingUsers = false;
                this.cdr.detectChanges();

      },
      error: (error) => {
        console.error('Error loading users:', error);
        this.loadingUsers = false;
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

  openUserListModal(): void {
    this.showUserListModal = true;
    this.loadUsers();
    
  }

  closeUserListModal(): void {
    this.showUserListModal = false;
  }

  startDirectChat(userId: number): void {
    this.chatService.createDirectChat({ user_id: userId }).subscribe({
      next: (response) => {
        this.closeUserListModal();
        this.router.navigate(['/chat/room', response.room.ID]);
      },
      error: (error) => {
        console.error('Error creating direct chat:', error);
        alert('Failed to start chat');
      }
    });
  }

  onRoomCreated(): void {
    this.closeCreateModal();
    this.loadRooms();
  }

  getRoomName(room: ChatRoom): string {
    return this.chatService.getDirectChatName(room, this.currentUserId);
  }

  getRoomAvatar(room: ChatRoom): string {
    const name = this.getRoomName(room);
    return name.charAt(0).toUpperCase();
  }

  isDirectChat(room: ChatRoom): boolean {
    return this.chatService.isDirectChat(room);
  }

  // NEW: Check if other user in direct chat is online
  isOtherUserOnline(room: ChatRoom): boolean {
    if (!this.isDirectChat(room)) return false;
    
    const otherUser = room.members.find(m => m.ID !== this.currentUserId);
    return otherUser ? (otherUser.is_online || false) : false;
  }

  // NEW: Get other user from direct chat
  getOtherUser(room: ChatRoom): User | undefined {
    return room.members.find(m => m.ID !== this.currentUserId);
  }

  // NEW: Format last seen for user
  getUserLastSeen(user: User): string {
    return this.presenceService.formatLastSeen(user.last_seen_at);
  }

  getLastMessageTime(room: ChatRoom): string {
    if (room.messages && room.messages.length > 0) {
      const lastMessage = room.messages[room.messages.length - 1];
      return this.formatDate(lastMessage.CreatedAt);
    }
    return this.formatDate(room.CreatedAt);
  }

  getLastMessagePreview(room: ChatRoom): string {
    if (room.messages && room.messages.length > 0) {
      const lastMessage = room.messages[room.messages.length - 1];
      return lastMessage.content.length > 50 
        ? lastMessage.content.substring(0, 50) + '...'
        : lastMessage.content;
    }
    return 'No messages yet';
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