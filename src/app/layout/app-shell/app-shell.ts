import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../core/services/auth.service';
import { ThemeService } from '../../core/services/theme.service';
import { I18nService } from '../../core/i18n/i18n.service';
import { ToastOutletComponent } from '../../shared/toast-outlet/toast-outlet';

interface NavItem {
  labelKey: string;
  path: string;
  icon: string;
  visible: () => boolean;
}

const SIDEBAR_COLLAPSED_KEY = 'warehouse-sidebar-collapsed';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, MatIconModule, ToastOutletComponent],
  templateUrl: './app-shell.html',
  styleUrl: './app-shell.scss',
})
export class AppShellComponent {
  private readonly authService = inject(AuthService);
  private readonly themeService = inject(ThemeService);
  private readonly i18n = inject(I18nService);

  readonly user = this.authService.currentUser;
  readonly theme = this.themeService.theme;
  readonly language = this.i18n.language;

  readonly sidebarCollapsed = signal(localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === 'true');

  readonly navItems = computed<NavItem[]>(() => [
    {
      labelKey: 'common.dashboard',
      path: '/app/dashboard',
      icon: 'dashboard',
      visible: () => true,
    },
    {
      labelKey: 'common.orders',
      path: '/app/orders',
      icon: 'assignment',
      visible: () => true,
    },
    {
      labelKey: 'common.stock',
      path: '/app/stock',
      icon: 'inventory_2',
      visible: () => true,
    },
    {
      labelKey: 'common.items',
      path: '/app/items',
      icon: 'category',
      visible: () => true,
    },
    {
      labelKey: 'common.warehouseLocations',
      path: '/app/warehouse-locations',
      icon: 'warehouse',
      visible: () => this.authService.canUseWarehouseArea(),
    },
    {
      labelKey: 'common.companies',
      path: '/app/companies',
      icon: 'business',
      visible: () =>
        this.authService.hasAnyRole(['GLOBAL_ADMIN', 'WAREHOUSE_ADMIN', 'COMPANY_ADMIN']),
    },
    {
      labelKey: 'common.users',
      path: '/app/users',
      icon: 'group',
      visible: () => this.authService.canManageUsers(),
    },
    {
      labelKey: 'common.referenceData',
      path: '/app/reference-data',
      icon: 'tune',
      visible: () => this.authService.canManageReferenceData(),
    },
    {
      labelKey: 'common.documents',
      path: '/app/documents',
      icon: 'description',
      visible: () => true,
    },
    {
      labelKey: 'common.billing',
      path: '/app/billing',
      icon: 'receipt_long',
      visible: () => this.authService.canManageBilling(),
    },
  ]);

  readonly visibleNavItems = computed(() => {
    return this.navItems().filter((item) => item.visible());
  });

  readonly primaryRoleLabel = computed(() => {
    const roleCode = this.user()?.roles?.[0]?.roleCode;

    if (!roleCode) {
      return '';
    }

    return this.t(`roles.${roleCode}`);
  });

  readonly languageButtonLabel = computed(() => {
    return this.language() === 'sl' ? 'EN' : 'SLO';
  });

  t(path: string): string {
    return this.i18n.t(path);
  }

  toggleSidebar(): void {
    this.sidebarCollapsed.update((value) => {
      const next = !value;
      localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(next));
      return next;
    });
  }

  toggleTheme(): void {
    this.themeService.toggleTheme();
  }

  toggleLanguage(): void {
    this.i18n.toggleLanguage();
  }

  logout(): void {
    this.authService.logout();
  }
}
