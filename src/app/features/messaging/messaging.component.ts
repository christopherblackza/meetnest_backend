import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormControl, FormGroup } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatSortModule, Sort } from '@angular/material/sort';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatChipsModule } from '@angular/material/chips';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { SupabaseService, ChatMessage, UserProfile, DataGridOptions, DataGridResult } from '../../core/services/supabase.service';
import { Router } from '@angular/router';
import {MatDividerModule} from '@angular/material/divider';


interface ChatMessageWithDetails extends ChatMessage {
  sender_profile: UserProfile;
  chat_info: {
    id: string;
    type: 'event' | 'meetup' | 'direct';
    name?: string;
  };
  reports_count: number;
}

@Component({
  selector: 'app-messaging',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatButtonModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    MatDatepickerModule,
    MatNativeDateModule,
    MatChipsModule,
    MatMenuModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatCheckboxModule,
    MatDividerModule
  ],
  templateUrl: './messaging.component.html',
  styleUrl: './messaging.component.scss'
})
export class MessagingComponent implements OnInit {
  private supabaseService = inject(SupabaseService);
  private router = inject(Router);
  private snackBar = inject(MatSnackBar);
  private dialog = inject(MatDialog);

  // Signals
  loading = signal(false);
  messages = signal<ChatMessageWithDetails[]>([]);
  dataResult = signal<DataGridResult<ChatMessageWithDetails> | null>(null);
  currentPage = signal(0);
  pageSize = signal(25);
  sortBy = signal<string>('created_at');
  sortOrder = signal<'asc' | 'desc'>('desc');

  // Computed stats
  reportedMessages = computed(() => 
    this.messages().filter(m => m.reports_count > 0).length
  );
  
  flaggedMessages = computed(() => 
    this.messages().filter(m => (m as any).status === 'flagged').length
  );
  
  todayMessages = computed(() => {
    const today = new Date().toDateString();
    return this.messages().filter(m => {
      const messageDate = new Date(m.created_at).toDateString();
      return messageDate === today;
    }).length;
  });

  // Form
  filtersForm = new FormGroup({
    search: new FormControl(''),
    status: new FormControl(''),
    messageType: new FormControl(''),
    chatType: new FormControl(''),
    startDate: new FormControl(),
    endDate: new FormControl()
  });

  displayedColumns = ['content', 'sender', 'chatInfo', 'timestamp', 'reports', 'actions'];

  ngOnInit() {
    this.loadMessages();
    
    // Auto-apply filters on form changes with debounce
    this.filtersForm.valueChanges.subscribe(() => {
      setTimeout(() => this.applyFilters(), 300);
    });
  }

  async loadMessages() {
    this.loading.set(true);
    
    try {
      const options: DataGridOptions = {
        page: this.currentPage(),
        pageSize: this.pageSize(),
        sortBy: this.sortBy(),
        sortOrder: this.sortOrder(),
        search: this.filtersForm.value.search || undefined,
        filters: {
          status: this.filtersForm.value.status || undefined,
          messageType: this.filtersForm.value.messageType || undefined,
          chatType: this.filtersForm.value.chatType || undefined,
          dateFrom: this.filtersForm.value.startDate ? this.filtersForm.value.startDate.toISOString() : undefined,
          dateTo: this.filtersForm.value.endDate ? this.filtersForm.value.endDate.toISOString() : undefined
        }
      };

      const result = await this.supabaseService.getChatMessagesGrid(options);
      this.dataResult.set(result);
      // Map the result data to include default values for missing properties
      const messagesWithDefaults = result.data.map(msg => ({
        ...msg,
        message_type: (msg as any).message_type || 'text',
        status: (msg as any).status || 'active'
      })) as ChatMessageWithDetails[];
      this.messages.set(messagesWithDefaults);
    } catch (error) {
      console.error('Error loading messages:', error);
      this.snackBar.open('Error loading messages', 'Close', { duration: 3000 });
    } finally {
      this.loading.set(false);
    }
  }

  onPageChange(event: PageEvent) {
    this.currentPage.set(event.pageIndex);
    this.pageSize.set(event.pageSize);
    this.loadMessages();
  }

  onSortChange(sort: Sort) {
    this.sortBy.set(sort.active);
    this.sortOrder.set(sort.direction as 'asc' | 'desc' || 'desc');
    this.currentPage.set(0);
    this.loadMessages();
  }

  applyFilters() {
    this.currentPage.set(0);
    this.loadMessages();
  }

  clearFilters() {
    this.filtersForm.reset();
    this.currentPage.set(0);
    this.loadMessages();
  }

  getMessageTypeClass(type: string): string {
    return `${type}-chip`;
  }

  getChatTypeClass(type: string): string {
    return `${type}-chip`;
  }

  async exportToCsv() {
    try {
      this.loading.set(true);
      const options: DataGridOptions = {
        page: 0,
        pageSize: 10000, // Large number to get all data
        sortBy: this.sortBy(),
        sortOrder: this.sortOrder(),
        search: this.filtersForm.value.search || undefined,
        filters: {
          status: this.filtersForm.value.status || undefined,
          messageType: this.filtersForm.value.messageType || undefined,
          chatType: this.filtersForm.value.chatType || undefined,
          dateFrom: this.filtersForm.value.startDate ? this.filtersForm.value.startDate.toISOString() : undefined,
          dateTo: this.filtersForm.value.endDate ? this.filtersForm.value.endDate.toISOString() : undefined
        }
      };

      const csvData = await this.supabaseService.exportToCSV('chat_messages', options);
      
      // Create and download CSV file
      const blob = new Blob([csvData], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `messages_${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
      window.URL.revokeObjectURL(url);
      
      this.snackBar.open('Messages exported successfully', 'Close', { duration: 3000 });
    } catch (error) {
      console.error('Error exporting messages:', error);
      this.snackBar.open('Error exporting messages', 'Close', { duration: 3000 });
    } finally {
      this.loading.set(false);
    }
  }

  viewMessage(message: ChatMessageWithDetails) {
    // Navigate to message details or open dialog
    this.snackBar.open(`Viewing message: ${message.content.slice(0, 50)}...`, 'Close', { duration: 3000 });
  }

  async approveMessage(message: ChatMessageWithDetails) {
    try {
      // Update message status to approved/active
      const { error } = await this.supabaseService.client
        .from('chat_messages')
        .update({ status: 'active' })
        .eq('id', message.id);

      if (error) throw error;

      this.snackBar.open(`Approved message from ${message.sender_profile?.display_name}`, 'Close', { duration: 3000 });
      this.loadMessages(); // Refresh the list
    } catch (error) {
      console.error('Error approving message:', error);
      this.snackBar.open('Error approving message', 'Close', { duration: 3000 });
    }
  }

  async flagMessage(message: ChatMessageWithDetails) {
    try {
      // Update message status to flagged
      const { error } = await this.supabaseService.client
        .from('chat_messages')
        .update({ status: 'flagged' })
        .eq('id', message.id);

      if (error) throw error;

      this.snackBar.open(`Flagged message from ${message.sender_profile?.display_name}`, 'Close', { duration: 3000 });
      this.loadMessages(); // Refresh the list
    } catch (error) {
      console.error('Error flagging message:', error);
      this.snackBar.open('Error flagging message', 'Close', { duration: 3000 });
    }
  }

  async warnUser(message: ChatMessageWithDetails) {
    try {
      // Create a moderation action for warning
      const { error } = await this.supabaseService.client
        .from('moderation_actions')
        .insert({
          user_id: message.sender_id,
          admin_id: this.supabaseService.user?.id,
          action_type: 'warning',
          reason: 'Inappropriate message content'
        });

      if (error) throw error;

      this.snackBar.open(`Warning sent to ${message.sender_profile?.display_name}`, 'Close', { duration: 3000 });
    } catch (error) {
      console.error('Error warning user:', error);
      this.snackBar.open('Error sending warning', 'Close', { duration: 3000 });
    }
  }

  async deleteMessage(message: ChatMessageWithDetails) {
    const confirmed = confirm(`Are you sure you want to delete this message from ${message.sender_profile?.display_name}?`);
    
    if (confirmed) {
      try {
        // Update message status to deleted
        const { error } = await this.supabaseService.client
          .from('chat_messages')
          .update({ status: 'deleted' })
          .eq('id', message.id);

        if (error) throw error;

        this.snackBar.open(`Message deleted`, 'Close', { duration: 3000 });
        this.loadMessages(); // Refresh the list
      } catch (error) {
        console.error('Error deleting message:', error);
        this.snackBar.open('Error deleting message', 'Close', { duration: 3000 });
      }
    }
  }
}