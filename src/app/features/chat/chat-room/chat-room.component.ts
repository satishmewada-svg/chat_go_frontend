// src/app/features/chat/chat-room/chat-room.component.ts
import { Component, OnInit, OnDestroy, ViewChild, ElementRef, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { Subscription, interval } from 'rxjs';

import { ChatRoom, Message, User, WebSocketMessage } from '../../../core/models/user.models';
import { ChatService } from '../../../core/services/chat';
import { WebSocketService } from '../../../core/services/websocket';
import { AuthService } from '../../../core/services/auth';
import { PresenceService } from '../../../core/services/presence';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
@Component({
  selector: 'app-chat-room',
  templateUrl: './chat-room.component.html',
  styleUrls: ['./chat-room.component.scss'],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModule,
    RouterModule
  ]
})
export class ChatRoomComponent implements OnInit, OnDestroy {
  @ViewChild('messagesContainer') private messagesContainer!: ElementRef;
  
  roomId!: number;
  room: ChatRoom | null = null;
  messages: Message[] = [];
  messageContent = '';
  loading = false;
  sending = false;
  currentUserId: number;
  
  // NEW: Typing indicator
  typingUsers: Set<number> = new Set();
  typingTimeout: any;
  isTyping = false;
  
  private wsSubscription?: Subscription;
  private statusCheckSubscription?: Subscription;

  constructor(
    private route: ActivatedRoute,
    private chatService: ChatService,
    private wsService: WebSocketService,
    private authService: AuthService,
    private presenceService: PresenceService,
        private cdr: ChangeDetectorRef

  ) {
    this.currentUserId = this.authService.currentUserValue?.ID || 0;
  }

  ngOnInit(): void {
    this.route.params.subscribe(params => {
      this.roomId = +params['id'];
      this.loadRoom();
      this.loadMessages();
      this.connectWebSocket();
      this.startStatusPolling();
    });
  }

  ngOnDestroy(): void {
    this.wsService.disconnect();
    if (this.wsSubscription) {
      this.wsSubscription.unsubscribe();
    }
    if (this.statusCheckSubscription) {
      this.statusCheckSubscription.unsubscribe();
    }
  }

  startStatusPolling(): void {
    // Check online status every 15 seconds for chat room
    this.statusCheckSubscription = interval(150000).subscribe(() => {
      this.checkOnlineStatus();
    });
  }

  checkOnlineStatus(): void {
    if (!this.room || !this.isDirectChat()) return;

    const otherUser = this.getOtherUser();
    if (otherUser) {
      this.presenceService.getOnlineStatus([otherUser.ID]).subscribe({
        next: (response) => {
          const isOnline = response.online_status[otherUser.ID];
          this.presenceService.updateOnlineStatus(otherUser.ID, isOnline);
          
          // Update user in room
          if (this.room) {
            const userIndex = this.room.members.findIndex(m => m.ID === otherUser.ID);
            if (userIndex !== -1) {
              this.room.members[userIndex].is_online = isOnline;
            }
          }
        },
        error: (err) => console.error('Error checking status:', err)
      });
    }
  }

  loadRoom(): void {
    this.chatService.getRoomById(this.roomId).subscribe({
      next: (response) => {
        this.room = response.room;
        this.checkOnlineStatus();
      },
      error: (error) => {
        console.error('Error loading room:', error);
      }
    });
  }

  loadMessages(): void {
    this.loading = true;
    this.chatService.getRoomMessages(this.roomId, 50, 0).subscribe({
      next: (response) => {
        this.messages = (response.messages || []).reverse();
        this.loading = false;
                this.cdr.detectChanges();

        setTimeout(() => this.scrollToBottom(), 100);
      },
      error: (error) => {
        console.error('Error loading messages:', error);
                this.cdr.detectChanges();

        this.loading = false;
      }
    });
  }

  connectWebSocket(): void {
    this.wsSubscription = this.wsService.connect(this.roomId).subscribe({
      next: (wsMessage: WebSocketMessage) => {
        console.log('Received WebSocket message:', wsMessage);
        if (wsMessage.type === 'message' && wsMessage.message) {
          const newMessage = wsMessage.message as Message;
          
          // Remove temporary message (ID === 0) from the same sender with same content
          this.messages = this.messages.filter(m => !(m.ID === 0 && m.sender_id === newMessage.sender_id && m.content === newMessage.content));
          
          // Add the real message
          this.messages.push(newMessage);
          this.cdr.detectChanges();
          setTimeout(() => this.scrollToBottom(), 100);
          
        }
        // Handle typing indicators
        else if (wsMessage.type === 'typing' && wsMessage.userId) {
          if (wsMessage.typing) {
            this.typingUsers.add(wsMessage.userId);
          } else {
            this.typingUsers.delete(wsMessage.userId);
          }
          this.cdr.detectChanges();
        }
      },
      error: (error) => {
        console.error('WebSocket error:', error);
      }
    });
  }

  // NEW: Send typing indicator
  onMessageInput(): void {
    if (!this.isTyping) {
      this.isTyping = true;
      this.wsService.sendMessage({
        type: 'typing',
        typing: true
      });
    }

    // Clear existing timeout
    if (this.typingTimeout) {
      clearTimeout(this.typingTimeout);
    }

    // Set timeout to stop typing after 1 second of inactivity
    this.typingTimeout = setTimeout(() => {
      this.isTyping = false;
      this.wsService.sendMessage({
        type: 'typing',
        typing: false
      });
    }, 1000);
  }

  // NEW: Get typing users display (exclude current user)
  getTypingUsersText(): string {
    if (this.typingUsers.size === 0) return '';
    
    const typingUsersList = Array.from(this.typingUsers)
      .filter(userId => userId !== this.currentUserId)  // Exclude self
      .map(userId => {
        const user = this.room?.members.find(m => m.ID === userId);
        return user?.name || 'User';
      });

    if (typingUsersList.length === 0) return '';  // No other users typing
    
    if (typingUsersList.length === 1) {
      return `${typingUsersList[0]} is typing...`;
    } else {
      return `${typingUsersList.join(', ')} are typing...`;
    }
  }

sendMessage(): void {
  if (!this.messageContent.trim() || this.sending) {
    return;
  }

  const content = this.messageContent.trim();

  // TEMPORARY MESSAGE FOR INSTANT UI UPDATE
  const tempMessage: Message = {
    ID: 0, // temporary
    room_id: this.roomId,
    sender_id: this.currentUserId,
    content: content,
      is_read: false,
    CreatedAt: new Date().toISOString(),
    UpdatedAt: new Date().toISOString()
  };
  
  this.messages.push(tempMessage);
  this.scrollToBottom();

  this.messageContent = '';
  this.sending = true;

  this.chatService.sendMessage(this.roomId, { content }).subscribe({
    next: () => {
      // DO NOTHING — real message will arrive via WebSocket
      this.sending = false;
      this.cdr.detectChanges();
    },
    error: (error) => {
      console.error('Error sending message:', error);

      // restore message box
      this.messageContent = content;

      // remove temp message
      this.messages = this.messages.filter(m => m !== tempMessage);

      this.sending = false;
      this.cdr.detectChanges();
    }
  });
}


  onKeyPress(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.sendMessage();
    }
  }

  isOwnMessage(message: Message): boolean {
    return message.sender_id === this.currentUserId;
  }

  getRoomDisplayName(): string {
    if (!this.room) return 'Loading...';
    return this.chatService.getDirectChatName(this.room, this.currentUserId);
  }

  isDirectChat(): boolean {
    return this.room ? this.chatService.isDirectChat(this.room) : false;
  }

  // NEW: Get other user in direct chat
  getOtherUser(): User | undefined {
    if (!this.room || !this.isDirectChat()) return undefined;
    return this.room.members.find(m => m.ID !== this.currentUserId);
  }

  // NEW: Check if other user is online
  isOtherUserOnline(): boolean {
    const otherUser = this.getOtherUser();
    return otherUser ? (otherUser.is_online || false) : false;
  }

  // NEW: Get last seen of other user
  getOtherUserLastSeen(): string {
    const otherUser = this.getOtherUser();
    return otherUser ? this.presenceService.formatLastSeen(otherUser.last_seen_at) : 'Unknown';
  }

  formatMessageTime(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  formatMessageDate(dateString: string): string {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString();
    }
  }

  shouldShowDateSeparator(index: number): boolean {
    if (index === 0) return true;
    
    const currentDate = new Date(this.messages[index].CreatedAt).toDateString();
    const previousDate = new Date(this.messages[index - 1].CreatedAt).toDateString();
    
    return currentDate !== previousDate;
  }

  private scrollToBottom(): void {
    try {
      if (this.messagesContainer) {
        this.messagesContainer.nativeElement.scrollTop = 
          this.messagesContainer.nativeElement.scrollHeight;
      }
    } catch (err) {
      console.error('Error scrolling to bottom:', err);
    }
  }
}