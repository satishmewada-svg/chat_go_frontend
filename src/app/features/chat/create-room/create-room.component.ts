// src/app/features/chat/create-room/create-room.component.ts
import { ChangeDetectorRef, Component, EventEmitter, OnInit, Output } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ChatService } from '../../../core/services/chat';
import { CommonModule } from '@angular/common';
import { User } from '../../../core/models/user.models';
import { debounceTime, distinctUntilChanged, Subject } from 'rxjs';

@Component({
  selector: 'app-create-room',
  templateUrl: './create-room.component.html',
  styleUrl: './create-room.component.scss',
  imports: [CommonModule, ReactiveFormsModule, FormsModule]
})
export class CreateRoomComponent implements OnInit {
  @Output() roomCreated = new EventEmitter<void>();
  @Output() cancelled = new EventEmitter<void>();

  createRoomForm!: FormGroup;
  loading = false;
  errorMessage = '';
  
  // NEW: User search functionality
  searchQuery = '';
  searchResults: User[] = [];
  selectedMembers: User[] = [];
  searching = false;
  showSearchResults = false;
  private searchSubject = new Subject<string>();

  constructor(
    private formBuilder: FormBuilder,
    private chatService: ChatService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.createRoomForm = this.formBuilder.group({
      name: ['', [Validators.required, Validators.minLength(3)]],
      description: ['']
    });

    // Setup search debouncing
    this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged()
    ).subscribe(query => {
      this.performSearch(query);
    });
  }

  get f() {
    return this.createRoomForm.controls;
  }

  // NEW: Search users
  onSearchInput(event: Event): void {
    const query = (event.target as HTMLInputElement).value;
    this.searchQuery = query;
    
    if (query.trim().length > 0) {
      this.showSearchResults = true;
      this.searchSubject.next(query);
    } else {
      this.showSearchResults = false;
      this.searchResults = [];
    }
  }

  performSearch(query: string): void {
    if (!query.trim()) {
      this.searchResults = [];
      return;
    }

    this.searching = true;
    this.chatService.searchUsers(query).subscribe({
      next: (response) => {
        this.searchResults = response.users.filter(
          user => !this.selectedMembers.some(m => m.ID === user.ID)
        );
        this.searching = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('Error searching users:', error);
        this.searching = false;
        this.cdr.detectChanges();
      }
    });
  }

  // NEW: Add member to selection
  addMember(user: User): void {
    if (!this.selectedMembers.some(m => m.ID === user.ID)) {
      this.selectedMembers.push(user);
      this.searchResults = this.searchResults.filter(u => u.ID !== user.ID);
      this.searchQuery = '';
      this.showSearchResults = false;
      this.cdr.detectChanges();
    }
  }

  // NEW: Remove member from selection
  removeMember(userId: number): void {
    this.selectedMembers = this.selectedMembers.filter(m => m.ID !== userId);
    this.cdr.detectChanges();
  }

  onSubmit(): void {
    if (this.createRoomForm.invalid) {
      return;
    }

    this.loading = true;
    this.errorMessage = '';

    const formData = {
      name: this.f['name'].value,
      description: this.f['description'].value,
      member_ids: this.selectedMembers.map(m => m.ID),
      is_group: true // Explicitly set as group chat
    };

    this.chatService.createRoom(formData).subscribe({
      next: () => {
        this.loading = false;
        this.roomCreated.emit();
        this.cdr.detectChanges();
      },
      error: (error) => {
        this.errorMessage = error.error?.error || 'Failed to create room';
        this.loading = false;
        this.cdr.detectChanges();
      }
    });
  }

  onCancel(): void {
    this.cancelled.emit();
  }
}