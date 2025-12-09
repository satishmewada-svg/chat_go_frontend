// src/app/features/chat/user-list/user-list.component.ts
import { ChangeDetectorRef, Component, EventEmitter, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ChatService } from '../../../core/services/chat';
import { User } from '../../../core/models/user.models';
import { Router } from '@angular/router';
import { debounceTime, distinctUntilChanged, Subject } from 'rxjs';

@Component({
  selector: 'app-user-list',
  templateUrl: './user-list.component.html',
  styleUrls: ['./user-list.component.scss'],
  imports: [CommonModule, FormsModule]
})
export class UserListComponent implements OnInit {
  @Output() cancelled = new EventEmitter<void>();

  users: User[] = [];
  filteredUsers: User[] = [];
  loading = false;
  creating = false;
  errorMessage = '';
  searchQuery = '';
  private searchSubject = new Subject<string>();

  constructor(
    private chatService: ChatService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadUsers();
    
    // Setup search debouncing
    this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged()
    ).subscribe(query => {
      this.filterUsers(query);
    });
  }

  loadUsers(): void {
    this.loading = true;
    this.errorMessage = '';

    this.chatService.getAllUsers().subscribe({
      next: (response) => {
        this.users = response.users || [];
        this.filteredUsers = [...this.users];
        this.loading = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        this.errorMessage = 'Failed to load users';
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  onSearchInput(event: Event): void {
    const query = (event.target as HTMLInputElement).value;
    this.searchQuery = query;
    this.searchSubject.next(query);
  }

  filterUsers(query: string): void {
    if (!query.trim()) {
      this.filteredUsers = [...this.users];
    } else {
      const lowerQuery = query.toLowerCase();
      this.filteredUsers = this.users.filter(user =>
        user.name.toLowerCase().includes(lowerQuery) ||
        user.email.toLowerCase().includes(lowerQuery)
      );
    }
    this.cdr.detectChanges();
  }

  createDirectChat(userId: number): void {
    this.creating = true;
    this.errorMessage = '';

    this.chatService.createDirectChat({ user_id: userId }).subscribe({
      next: (response) => {
        this.creating = false;
        // Navigate to the newly created chat room
        this.router.navigate(['/chat/room', response.room.ID]);
        this.onCancel();
      },
      error: (error) => {
        this.errorMessage = error.error?.error || 'Failed to create direct chat';
        this.creating = false;
        this.cdr.detectChanges();
      }
    });
  }

  onCancel(): void {
    this.cancelled.emit();
  }
}