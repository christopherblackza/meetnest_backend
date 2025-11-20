import { Component, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatSortModule } from '@angular/material/sort';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatChipsModule } from '@angular/material/chips';
import { MatTabsModule } from '@angular/material/tabs';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatBadgeModule } from '@angular/material/badge';
import { MatMenuModule } from '@angular/material/menu';
import { MatExpansionModule } from '@angular/material/expansion';
import { ReactiveFormsModule, FormControl, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { SupabaseService } from '../../core/services/supabase.service';
import { Subject, takeUntil, debounceTime, distinctUntilChanged } from 'rxjs';
import { MatTooltipModule } from '@angular/material/tooltip';

interface Interest {
  id: string;
  name: string;
  category: string;
  description?: string;
  icon?: string;
  color?: string;
  usage_count: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface Language {
  id: string;
  name: string;
  code: string;
  native_name: string;
  flag_emoji?: string;
  usage_count: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface Category {
  id: string;
  name: string;
  description?: string;
  parent_id?: string;
  icon?: string;
  color?: string;
  sort_order: number;
  is_active: boolean;
  interests_count: number;
  created_at: string;
  updated_at: string;
}

@Component({
  selector: 'app-catalog',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatDialogModule,
    MatSnackBarModule,
    MatChipsModule,
    MatTabsModule,
    MatProgressSpinnerModule,
    MatSlideToggleModule,
    MatBadgeModule,
    MatMenuModule,
    MatExpansionModule,
    ReactiveFormsModule,
    MatTooltipModule
  ],
  templateUrl: './catalog.component.html',
  styleUrl: './catalog.component.scss'
})
export class CatalogComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  // Signals for reactive state management
  loadingInterests = signal(true);
  loadingLanguages = signal(true);
  loadingCategories = signal(true);
  
  interests = signal<Interest[]>([]);
  languages = signal<Language[]>([]);
  categories = signal<Category[]>([]);
  
  totalInterests = signal(0);
  totalLanguages = signal(0);
  totalCategories = signal(0);
  
  currentPage = signal(0);
  pageSize = signal(25);
  selectedTabIndex = 0;

  // Computed stats
  activeItems = computed(() => {
    const activeInterests = this.interests().filter(i => i.is_active).length;
    const activeLanguages = this.languages().filter(l => l.is_active).length;
    const activeCategories = this.categories().filter(c => c.is_active).length;
    return activeInterests + activeLanguages + activeCategories;
  });

  // Form controls for filters
  interestsSearchControl = new FormControl('');
  interestsCategoryControl = new FormControl('all');
  interestsStatusControl = new FormControl('all');
  
  languagesSearchControl = new FormControl('');
  languagesStatusControl = new FormControl('all');
  
  categoriesSearchControl = new FormControl('');
  categoriesStatusControl = new FormControl('all');

  // Table configurations
  interestsColumns = ['name', 'category', 'usage', 'actions'];
  languagesColumns = ['name', 'code', 'usage', 'actions'];
  categoriesColumns = ['name', 'description', 'interests_count', 'sort_order', 'actions'];

  constructor(
    private supabaseService: SupabaseService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar,
    private fb: FormBuilder
  ) {}

  ngOnInit() {
    this.setupFilters();
    this.loadAllData();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private setupFilters() {
    // Setup search debouncing for interests
    this.interestsSearchControl.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe(() => this.loadInterests());

    [this.interestsCategoryControl, this.interestsStatusControl].forEach(control => {
      control.valueChanges.pipe(takeUntil(this.destroy$)).subscribe(() => this.loadInterests());
    });

    // Setup search debouncing for languages
    this.languagesSearchControl.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe(() => this.loadLanguages());

    this.languagesStatusControl.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.loadLanguages());

    // Setup search debouncing for categories
    this.categoriesSearchControl.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged(), takeUntil(this.destroy$))
      .subscribe(() => this.loadCategories());

    this.categoriesStatusControl.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.loadCategories());
  }

  private async loadAllData() {
    await Promise.all([
      this.loadInterests(),
      this.loadLanguages(),
      this.loadCategories()
    ]);
  }

  private async loadInterests() {
    this.loadingInterests.set(true);
    try {
      // TODO: Implement actual API call
      // For now, use mock data
      const mockInterests: Interest[] = [
        {
          id: '1',
          name: 'Photography',
          category: 'Arts & Creativity',
          description: 'Capturing moments through the lens',
          icon: 'camera_alt',
          color: '#9c27b0',
          usage_count: 1250,
          is_active: true,
          created_at: '2024-01-15T10:00:00Z',
          updated_at: '2024-02-15T10:00:00Z'
        },
        {
          id: '2',
          name: 'Hiking',
          category: 'Sports & Fitness',
          description: 'Exploring nature on foot',
          icon: 'terrain',
          color: '#4caf50',
          usage_count: 980,
          is_active: true,
          created_at: '2024-01-15T10:00:00Z',
          updated_at: '2024-02-15T10:00:00Z'
        },
        {
          id: '3',
          name: 'Cooking',
          category: 'Food & Drink',
          description: 'Creating delicious meals',
          icon: 'restaurant',
          color: '#ff9800',
          usage_count: 750,
          is_active: false,
          created_at: '2024-01-15T10:00:00Z',
          updated_at: '2024-02-15T10:00:00Z'
        }
      ];

      this.interests.set(mockInterests);
      this.totalInterests.set(mockInterests.length);
    } catch (error) {
      console.error('Error loading interests:', error);
      this.snackBar.open('Error loading interests', 'Close', { duration: 3000 });
    } finally {
      this.loadingInterests.set(false);
    }
  }

  private async loadLanguages() {
    this.loadingLanguages.set(true);
    try {
      // TODO: Implement actual API call
      // For now, use mock data
      const mockLanguages: Language[] = [
        {
          id: '1',
          name: 'English',
          code: 'en',
          native_name: 'English',
          flag_emoji: '🇺🇸',
          usage_count: 2500,
          is_active: true,
          created_at: '2024-01-15T10:00:00Z',
          updated_at: '2024-02-15T10:00:00Z'
        },
        {
          id: '2',
          name: 'Spanish',
          code: 'es',
          native_name: 'Español',
          flag_emoji: '🇪🇸',
          usage_count: 1800,
          is_active: true,
          created_at: '2024-01-15T10:00:00Z',
          updated_at: '2024-02-15T10:00:00Z'
        },
        {
          id: '3',
          name: 'French',
          code: 'fr',
          native_name: 'Français',
          flag_emoji: '🇫🇷',
          usage_count: 1200,
          is_active: true,
          created_at: '2024-01-15T10:00:00Z',
          updated_at: '2024-02-15T10:00:00Z'
        }
      ];

      this.languages.set(mockLanguages);
      this.totalLanguages.set(mockLanguages.length);
    } catch (error) {
      console.error('Error loading languages:', error);
      this.snackBar.open('Error loading languages', 'Close', { duration: 3000 });
    } finally {
      this.loadingLanguages.set(false);
    }
  }

  private async loadCategories() {
    this.loadingCategories.set(true);
    try {
      // TODO: Implement actual API call
      // For now, use mock data
      const mockCategories: Category[] = [
        {
          id: '1',
          name: 'Arts & Creativity',
          description: 'Creative and artistic pursuits',
          icon: 'palette',
          color: '#9c27b0',
          sort_order: 1,
          is_active: true,
          interests_count: 15,
          created_at: '2024-01-15T10:00:00Z',
          updated_at: '2024-02-15T10:00:00Z'
        },
        {
          id: '2',
          name: 'Sports & Fitness',
          description: 'Physical activities and sports',
          icon: 'fitness_center',
          color: '#4caf50',
          sort_order: 2,
          is_active: true,
          interests_count: 22,
          created_at: '2024-01-15T10:00:00Z',
          updated_at: '2024-02-15T10:00:00Z'
        },
        {
          id: '3',
          name: 'Food & Drink',
          description: 'Culinary interests and dining',
          icon: 'restaurant',
          color: '#ff9800',
          sort_order: 3,
          is_active: true,
          interests_count: 8,
          created_at: '2024-01-15T10:00:00Z',
          updated_at: '2024-02-15T10:00:00Z'
        }
      ];

      this.categories.set(mockCategories);
      this.totalCategories.set(mockCategories.length);
    } catch (error) {
      console.error('Error loading categories:', error);
      this.snackBar.open('Error loading categories', 'Close', { duration: 3000 });
    } finally {
      this.loadingCategories.set(false);
    }
  }

  getActiveTabName(): string {
    switch (this.selectedTabIndex) {
      case 0: return 'Interest';
      case 1: return 'Language';
      case 2: return 'Category';
      default: return 'Item';
    }
  }

  getCategoryColor(categoryName: string): string {
    const category = this.categories().find(c => c.name === categoryName);
    return category?.color || '#e0e0e0';
  }

  getUsagePercentage(usageCount: number): number {
    const maxUsage = Math.max(
      ...this.interests().map(i => i.usage_count),
      ...this.languages().map(l => l.usage_count)
    );
    return maxUsage > 0 ? (usageCount / maxUsage) * 100 : 0;
  }

  onTabChange(event: any) {
    this.selectedTabIndex = event.index;
  }

  onPageChange(event: PageEvent) {
    this.currentPage.set(event.pageIndex);
    this.pageSize.set(event.pageSize);
    // Reload current tab data
    switch (this.selectedTabIndex) {
      case 0: this.loadInterests(); break;
      case 1: this.loadLanguages(); break;
      case 2: this.loadCategories(); break;
    }
  }

  openCreateDialog() {
    // TODO: Implement create dialog based on active tab
    const itemType = this.getActiveTabName();
    this.snackBar.open(`Create ${itemType} dialog - Coming soon!`, 'Close', { duration: 3000 });
  }

  editInterest(interest: Interest) {
    // TODO: Implement edit interest dialog
    this.snackBar.open(`Editing interest: ${interest.name}`, 'Close', { duration: 3000 });
  }

  editLanguage(language: Language) {
    // TODO: Implement edit language dialog
    this.snackBar.open(`Editing language: ${language.name}`, 'Close', { duration: 3000 });
  }

  editCategory(category: Category) {
    // TODO: Implement edit category dialog
    this.snackBar.open(`Editing category: ${category.name}`, 'Close', { duration: 3000 });
  }

  async toggleInterestStatus(interest: Interest) {
    try {
      // TODO: Implement toggle functionality
      const newStatus = !interest.is_active;
      this.snackBar.open(
        `Interest "${interest.name}" ${newStatus ? 'activated' : 'deactivated'}`,
        'Close',
        { duration: 3000 }
      );
      this.loadInterests();
    } catch (error) {
      console.error('Error toggling interest status:', error);
      this.snackBar.open('Error updating interest status', 'Close', { duration: 3000 });
    }
  }

  async toggleLanguageStatus(language: Language) {
    try {
      // TODO: Implement toggle functionality
      const newStatus = !language.is_active;
      this.snackBar.open(
        `Language "${language.name}" ${newStatus ? 'activated' : 'deactivated'}`,
        'Close',
        { duration: 3000 }
      );
      this.loadLanguages();
    } catch (error) {
      console.error('Error toggling language status:', error);
      this.snackBar.open('Error updating language status', 'Close', { duration: 3000 });
    }
  }

  async toggleCategoryStatus(category: Category) {
    try {
      // TODO: Implement toggle functionality
      const newStatus = !category.is_active;
      this.snackBar.open(
        `Category "${category.name}" ${newStatus ? 'activated' : 'deactivated'}`,
        'Close',
        { duration: 3000 }
      );
      this.loadCategories();
    } catch (error) {
      console.error('Error toggling category status:', error);
      this.snackBar.open('Error updating category status', 'Close', { duration: 3000 });
    }
  }

  async deleteInterest(interest: Interest) {
    if (confirm(`Are you sure you want to delete "${interest.name}"?`)) {
      try {
        // TODO: Implement delete functionality
        this.snackBar.open(`Interest "${interest.name}" deleted successfully`, 'Close', { duration: 3000 });
        this.loadInterests();
      } catch (error) {
        console.error('Error deleting interest:', error);
        this.snackBar.open('Error deleting interest', 'Close', { duration: 3000 });
      }
    }
  }

  async deleteLanguage(language: Language) {
    if (confirm(`Are you sure you want to delete "${language.name}"?`)) {
      try {
        // TODO: Implement delete functionality
        this.snackBar.open(`Language "${language.name}" deleted successfully`, 'Close', { duration: 3000 });
        this.loadLanguages();
      } catch (error) {
        console.error('Error deleting language:', error);
        this.snackBar.open('Error deleting language', 'Close', { duration: 3000 });
      }
    }
  }

  async deleteCategory(category: Category) {
    if (confirm(`Are you sure you want to delete "${category.name}"? This will affect ${category.interests_count} interests.`)) {
      try {
        // TODO: Implement delete functionality
        this.snackBar.open(`Category "${category.name}" deleted successfully`, 'Close', { duration: 3000 });
        this.loadCategories();
      } catch (error) {
        console.error('Error deleting category:', error);
        this.snackBar.open('Error deleting category', 'Close', { duration: 3000 });
      }
    }
  }

  async exportData() {
    try {
      // TODO: Implement CSV export based on active tab
      const itemType = this.getActiveTabName();
      this.snackBar.open(`Export ${itemType}s functionality - Coming soon!`, 'Close', { duration: 3000 });
    } catch (error) {
      console.error('Error exporting data:', error);
      this.snackBar.open('Error exporting data', 'Close', { duration: 3000 });
    }
  }
}