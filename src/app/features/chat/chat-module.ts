// src/app/features/chat/chat.module.ts - FOR STANDALONE COMPONENTS
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { RouterModule, Routes } from '@angular/router';
import { ChatListComponent } from './chat-list/chat-list.component';
import { ChatRoomComponent } from './chat-room/chat-room.component';
import { CreateRoomComponent } from './create-room/create-room.component';

const routes: Routes = [
  { path: '', component: ChatListComponent },
  { path: 'room/:id', component: ChatRoomComponent }
];

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    RouterModule.forChild(routes),
    ChatListComponent,
    ChatRoomComponent,
    CreateRoomComponent
  ]
})
export class ChatModule { }