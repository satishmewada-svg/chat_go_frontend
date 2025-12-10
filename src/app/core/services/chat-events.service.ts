import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ChatEventsService {
  private refreshRoomsSource = new Subject<void>();
  refreshRooms$ = this.refreshRoomsSource.asObservable();

  triggerRefreshRooms() {
    this.refreshRoomsSource.next();
  }
}
