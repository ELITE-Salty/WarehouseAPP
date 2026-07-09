import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { ThemeService } from '../../core/services/theme.service';
import { I18nService } from '../../core/i18n/i18n.service';

interface NavItem {
  labelKey: string;
  path: string;
  visible: () => boolean;
}

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive],
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

  readonly sidebarCollapsed = signal(false);

  readonly navItems = computed<NavItem[]>(() => [
    {
      labelKey: 'common.dashboard',
      path: '/app/dashboard',
      visible: () => true,
    },
    {
      labelKey: 'common.orders',
      path: '/app/orders',
      visible: () => true,
    },
    {
      labelKey: 'common.stock',
      path: '/app/stock',
      visible: () => true,
    },
    {
      labelKey: 'common.items',
      path: '/app/items',
      visible: () => true,
    },
    {
      labelKey: 'common.warehouseLocations',
      path: '/app/warehouse-locations',
      visible: () => this.authService.canUseWarehouseArea(),
    },
    {
      labelKey: 'common.companies',
      path: '/app/companies',
      visible: () =>
        this.authService.hasAnyRole([
          'GLOBAL_ADMIN',
          'WAREHOUSE_ADMIN',
          'COMPANY_ADMIN',
        ]),
    },
    {
      labelKey: 'common.users',
      path: '/app/users',
      visible: () => this.authService.canManageUsers(),
    },
    {
      labelKey: 'common.referenceData',
      path: '/app/reference-data',
      visible: () => this.authService.canManageReferenceData(),
    },
    {
      labelKey: 'common.documents',
      path: '/app/documents',
      visible: () => true,
    },
    {
      labelKey: 'common.billing',
      path: '/app/billing',
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
    this.sidebarCollapsed.update((value) => !value);
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