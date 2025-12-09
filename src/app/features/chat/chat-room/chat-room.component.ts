// src/app/features/chat/chat-room/chat-room.component.ts
import { Component, OnInit, OnDestroy, ViewChild, ElementRef, ChangeDetectorRef } from '@angular/core';
import { Subscription } from 'rxjs';
import { ChatRoom, Message, WebSocketMessage } from '../../../core/models/user.models';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { ChatService } from '../../../core/services/chat';
import { WebSocketService } from '../../../core/services/websocket';
import { AuthService } from '../../../core/services/auth';
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
  currentUserId: number | undefined;
  
  private wsSubscription?: Subscription;

  constructor(
    private route: ActivatedRoute,
    private chatService: ChatService,
    private wsService: WebSocketService,
    private authService: AuthService,
    private cdr: ChangeDetectorRef
  ) {
    this.currentUserId = this.authService.currentUserValue?.ID;
  }

  ngOnInit(): void {
    console.log("ChatRoomComponent INIT");

    this.route.params.subscribe(params => {
      this.roomId = +params['id'];
      console.log("Room ID loaded:", this.roomId);

      this.loadRoom();
      this.loadMessages();
      this.connectWebSocket();
    });
  }

  ngOnDestroy(): void {
    console.log("ChatRoomComponent DESTROY → Closing WebSocket");
    this.wsService.disconnect();

    if (this.wsSubscription) {
      console.log("Unsubscribing from WebSocket");
      this.wsSubscription.unsubscribe();
    }
  }

  loadRoom(): void {
    console.log("Fetching room details…");
    this.chatService.getRoomById(this.roomId).subscribe({
      next: (response) => {
        console.log("Room loaded:", response.room);
        this.room = response.room;
      },
      error: (error) => {
        console.error('❌ Error loading room:', error);
      }
    });
  }

  loadMessages(): void {
    console.log("Fetching existing messages…");
    this.loading = true;

    this.chatService.getRoomMessages(this.roomId, 50, 0).subscribe({
      next: (response) => {
        console.log("Initial messages:", response.messages);
        this.messages = (response.messages || []).reverse();
        console.log("Messages after reversed:", this.messages);
        this.loading = false;
        this.cdr.detectChanges();
        setTimeout(() => this.scrollToBottom(), 100);
      },
      error: (error) => {
        console.error('❌ Error loading messages:', error);
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  connectWebSocket(): void {
    console.log("Connecting WebSocket for room:", this.roomId);

    this.wsSubscription = this.wsService.connect(this.roomId).subscribe({
      next: (wsMessage: WebSocketMessage) => {
        console.log("🔥 Real-time WS message received:", wsMessage);

        // The backend sends the actual message inside `content`
        if (wsMessage.type === 'message' && wsMessage.content) {
          console.log("👍 Adding LIVE message to UI:", wsMessage.content);
          this.messages.push(wsMessage.message as Message);
          this.cdr.detectChanges();
          setTimeout(() => this.scrollToBottom(), 100);
        } else {
          console.warn("⚠ WS message is not a chat message or missing content:", wsMessage);
        }
      },
      error: (error) => {
        console.error('❌ WebSocket stream error:', error);
      },
      complete: () => {
        console.warn("⚠ WebSocket stream completed (this should NOT normally happen)");
      }
    });
  }

  sendMessage(): void {
    if (!this.messageContent.trim() || this.sending) return;

    console.log("Sending message:", this.messageContent);

    this.sending = true;
    const content = this.messageContent;
    this.messageContent = '';

    this.chatService.sendMessage(this.roomId, { content }).subscribe({
      next: (response) => {
        console.log("Message sent successfully:", response);
        this.sending = false;

        // Reload messages to confirm it's stored in DB
        this.loadMessages();
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('❌ Error sending message:', error);
        this.messageContent = content;
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

  formatMessageTime(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }

  formatMessageDate(dateString: string): string {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) return 'Today';
    if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
    return date.toLocaleDateString();
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
        console.log("📜 Scrolled to bottom");
      }
    } catch (err) {
      console.error('❌ Error scrolling to bottom:', err);
    }
  }
}
