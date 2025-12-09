// src/app/core/services/websocket.service.ts
import { Injectable } from '@angular/core';
import { Observable, Subject, timer, shareReplay } from 'rxjs';
import { WebSocketMessage } from '../models/user.models';
import { AuthService } from './auth';
import { environment } from '../../../environments/environments';

@Injectable({
  providedIn: 'root'
})
export class WebSocketService {
  private socket: WebSocket | null = null;
  private message$ = new Subject<WebSocketMessage>();

  private reconnectAttempts = 0;
  private readonly maxReconnectAttempts = 5;
  private readonly reconnectDelay = 2000;

  private currentRoomId: number | null = null;
  private isManuallyClosed = false;

  constructor(private auth: AuthService) {}

  /** MAIN CONNECT FUNCTION */
  connect(roomId: number): Observable<WebSocketMessage> {
    this.isManuallyClosed = false;

    // If already connected to same room → return observable
    if (this.socket && this.socket.readyState === WebSocket.OPEN && this.currentRoomId === roomId) {
      console.log('Already connected to room:', roomId);
      return this.message$.asObservable().pipe(shareReplay(1));
    }

    // If switching rooms → close socket
    if (this.socket && this.currentRoomId !== roomId) {
      this.disconnect();
    }

    this.currentRoomId = roomId;

    const token = this.auth.token;
    if (!token) {
      console.error('No token found for WebSocket authentication');
      return this.message$.asObservable();
    }

    const wsUrl = `${environment.wsUrl}/chat/rooms/${roomId}/ws?token=${encodeURIComponent(token)}`;
    console.log('WS → Connecting:', wsUrl);

    this.createSocket(wsUrl, roomId);

    return this.message$.asObservable().pipe(shareReplay(1));
  }

  /** CREATE SOCKET */
  private createSocket(url: string, roomId: number) {
    this.socket = new WebSocket(url);

    this.socket.onopen = () => {
      console.log('WS → Connected to room', roomId);
      this.reconnectAttempts = 0;

      // Notify server
      this.sendMessage({
        type: 'connected',
        content: `User connected to room ${roomId}`
      });
    };

    this.socket.onmessage = (event) => {
      try {
        const msg: WebSocketMessage = JSON.parse(event.data);
        console.log('WS → Received:', msg);

        // Push to observable
        this.message$.next(msg);
      } catch (err) {
        console.error('WS → Invalid message JSON:', err);
      }
    };

    this.socket.onerror = (error) => {
      console.error('WS → Error:', error);
    };

    this.socket.onclose = (event) => {
      console.log(`WS → Closed (code ${event.code}): ${event.reason}`);

      if (!this.isManuallyClosed) this.tryReconnect(roomId);
    };
  }

  /** RECONNECT LOGIC */
  private tryReconnect(roomId: number) {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('WS → Max reconnect attempts reached.');
      this.message$.error('WebSocket connection failed.');
      return;
    }

    this.reconnectAttempts++;
    console.warn(`WS → Reconnecting ${this.reconnectAttempts}/${this.maxReconnectAttempts}...`);

    timer(this.reconnectDelay).subscribe(() => {
      if (!this.isManuallyClosed) {
        const token = this.auth.token;
        if (!token) return;

        const wsUrl = `${environment.wsUrl}/chat/rooms/${roomId}/ws?token=${encodeURIComponent(token)}`;
        this.createSocket(wsUrl, roomId);
      }
    });
  }

  /** SEND MESSAGE */
  sendMessage(message: WebSocketMessage): void {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      console.error('WS → Cannot send, socket not open');
      return;
    }

    const payload = JSON.stringify(message);
    console.log('WS → Sending:', payload);

    this.socket.send(payload);
  }

  /** MANUAL DISCONNECT */
  disconnect() {
    this.isManuallyClosed = true;
    if (this.socket) {
      console.log('WS → Manually disconnecting');
      this.socket.close(1000, 'Client closed connection');
    }

    this.socket = null;
    this.currentRoomId = null;
  }

  /** STATUS CHECK */
  isConnected(): boolean {
    return this.socket?.readyState === WebSocket.OPEN;
  }

   getConnectionState(): string {
    if (!this.socket) return 'CLOSED';
    
    switch (this.socket.readyState) {
      case WebSocket.CONNECTING: return 'CONNECTING';
      case WebSocket.OPEN: return 'OPEN';
      case WebSocket.CLOSING: return 'CLOSING';
      case WebSocket.CLOSED: return 'CLOSED';
      default: return 'UNKNOWN';
    }
  }
}

 