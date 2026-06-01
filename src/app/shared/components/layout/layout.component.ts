import { Component, inject, signal, ViewChild } from '@angular/core';
import { Router, RouterOutlet, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatSidenavModule, MatSidenav } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatMenuModule } from '@angular/material/menu';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { SupabaseService } from '../../../core/services/supabase.service';
import packageJson from '../../../../../package.json';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [
    CommonModule,
    RouterOutlet,
    RouterModule,
    MatToolbarModule,
    MatSidenavModule,
    MatListModule,
    MatIconModule,
    MatButtonModule,
    MatMenuModule
  ],
  templateUrl: './layout.component.html',
  styleUrl: './layout.component.scss'
})
export class LayoutComponent {
  @ViewChild('drawer') drawer!: MatSidenav;

  private supabase = inject(SupabaseService);
  private router = inject(Router);
  private breakpointObserver = inject(BreakpointObserver);

  appVersion = packageJson.version;
  isMobile = signal(false);

  constructor() {
    this.breakpointObserver.observe([Breakpoints.Handset, '(max-width: 768px)'])
      .subscribe(result => {
        this.isMobile.set(result.matches);
      });
  }

  onNavItemClick() {
    if (this.isMobile()) {
      this.drawer.close();
    }
  }

  async logout() {
    await this.supabase.signOut();
    this.router.navigate(['/auth']);
  }
}