import { Injectable, OnDestroy, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, interval, Subscription } from 'rxjs';
import { environment } from '../../../environments/environments';
import { AuthService } from './auth';


@Injectable({
  providedIn: 'root'
})
export class PresenceService implements OnDestroy {
  private apiUrl = `${environment.apiUrl}/presence`;
  private heartbeatSubscription?: Subscription;
  private onlineStatusSubject = new BehaviorSubject<Map<number, boolean>>(new Map());
  public onlineStatus$ = this.onlineStatusSubject.asObservable();
  private isBrowser: boolean;

  constructor(
    private http: HttpClient,
    private authService: AuthService,
    @Inject(PLATFORM_ID) platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
    
    if (this.isBrowser && this.authService.isAuthenticated()) {
      this.startHeartbeat();
    }

    // Listen to auth changes
    this.authService.currentUser.subscribe(user => {
      if (user && this.isBrowser) {
        this.startHeartbeat();
      } else {
        this.stopHeartbeat();
      }
    });
  }

  ngOnDestroy(): void {
    this.stopHeartbeat();
  }

  // Start sending heartbeat every 30 seconds
  startHeartbeat(): void {
    if (this.heartbeatSubscription) {
      return; // Already started
    }

    // Send initial heartbeat
    this.sendHeartbeat();

    // Send heartbeat every 30 seconds
    this.heartbeatSubscription = interval(30000).subscribe(() => {
      this.sendHeartbeat();
    });

    console.log('💓 Heartbeat started');
  }

  stopHeartbeat(): void {
    if (this.heartbeatSubscription) {
      this.heartbeatSubscription.unsubscribe();
      this.heartbeatSubscription = undefined;
      console.log('💔 Heartbeat stopped');
    }
  }

  private sendHeartbeat(): void {
    this.http.post(`${this.apiUrl}/heartbeat`, {}).subscribe({
      next: () => console.log('💓 Heartbeat sent'),
      error: (err) => console.error('Heartbeat failed:', err)
    });
  }

  // Get online status of specific users
  getOnlineStatus(userIds: number[]): Observable<{ online_status: { [key: number]: boolean } }> {
    return this.http.post<{ online_status: { [key: number]: boolean } }>(
      `${this.apiUrl}/status`,
      { user_ids: userIds }
    );
  }

  // Get all online users
  getAllOnlineUsers(): Observable<{ online_users: number[] }> {
    return this.http.get<{ online_users: number[] }>(
      `${this.apiUrl}/online`
    );
  }

  // Update local online status
  updateOnlineStatus(userId: number, isOnline: boolean): void {
    const currentStatus = this.onlineStatusSubject.value;
    currentStatus.set(userId, isOnline);
    this.onlineStatusSubject.next(currentStatus);
  }

  // Check if user is online
  isUserOnline(userId: number): boolean {
    return this.onlineStatusSubject.value.get(userId) || false;
  }

  // Format last seen time
  formatLastSeen(lastSeenAt: string | undefined): string {
    if (!lastSeenAt) return 'Never';

    const date = new Date(lastSeenAt);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHours < 24) return `${diffHours} hours ago`;
    if (diffDays < 7) return `${diffDays} days ago`;
    
    return date.toLocaleDateString();
  }
}