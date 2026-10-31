import { afterNextRender, Component, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Booking, BookingDraft, BookingStatus, PricingConfig } from './models/booking';
import { BookingApiService } from './services/booking-api.service';
import { BookingDetailComponent } from './components/booking-detail.component';
import { BookingFormComponent } from './components/booking-form.component';
import { BookingListComponent } from './components/booking-list.component';
import { DashboardComponent } from './components/dashboard.component';
import { PricingSettingsComponent } from './components/pricing-settings.component';

type MainView = 'overview' | 'bookings' | 'pricing';
type Theme = 'light' | 'dark';

@Component({
  imports: [
    BookingDetailComponent,
    BookingFormComponent,
    BookingListComponent,
    DashboardComponent,
    PricingSettingsComponent,
  ],
  selector: 'app-root',
  styleUrl: './app.css',
  templateUrl: './app.html',
})
export class App {
  private readonly api = inject(BookingApiService);

  protected readonly view = signal<MainView>('overview');
  protected readonly sidebarCollapsed = signal(true);
  protected readonly mobileMenuOpen = signal(false);
  protected readonly theme = signal<Theme>('light');
  protected readonly bookings = signal<Booking[]>([]);
  protected readonly pricing = signal<PricingConfig>({
    services: [],
    express: { enabled: false, label: '', amount: 0, unit: 'flat' },
    weightLimits: { minimumKg: 0, maximumKg: 0 },
  });
  protected readonly loading = signal(true);
  protected readonly apiError = signal('');
  protected readonly demoData = signal(false);
  protected readonly formOpen = signal(false);
  protected readonly editingBooking = signal<Booking | null>(null);
  protected readonly selectedBooking = signal<Booking | null>(null);
  protected readonly savingBooking = signal(false);
  protected readonly savingPricing = signal(false);
  protected readonly toast = signal('');
  protected readonly toastError = signal(false);

  constructor() {
    afterNextRender(() => {
      this.restoreTheme();
      this.loadData();
    });
  }

  protected toggleTheme(): void {
    const theme = this.theme() === 'light' ? 'dark' : 'light';
    this.theme.set(theme);
    this.applyTheme(theme);
  }

  private restoreTheme(): void {
    let theme: Theme = 'light';
    try {
      theme = globalThis.localStorage.getItem('wash-up-theme') === 'dark' ? 'dark' : 'light';
    } catch {
      // Keep the app usable when browser storage is unavailable.
    }
    this.theme.set(theme);
    globalThis.document.documentElement.dataset['theme'] = theme;
  }

  private applyTheme(theme: Theme): void {
    globalThis.document.documentElement.dataset['theme'] = theme;
    try {
      globalThis.localStorage.setItem('wash-up-theme', theme);
    } catch {
      // The selected theme still applies for this session without browser storage.
    }
  }

  protected selectView(view: MainView): void {
    this.view.set(view);
    this.mobileMenuOpen.set(false);
    this.selectedBooking.set(null);
    globalThis.window.scrollTo(0, 0);
  }

  protected toggleMobileMenu(): void {
    this.mobileMenuOpen.update((open) => !open);
  }

  protected closeMobileMenu(): void {
    this.mobileMenuOpen.set(false);
  }

  protected loadData(showLoading = true): void {
    if (showLoading) this.loading.set(true);
    this.apiError.set('');
    this.api.getBookings().subscribe({
      next: (response) => {
        this.bookings.set(response.bookings);
        this.demoData.set(response.demoData || response.bookings.some((booking) => booking.demoRecord));
        this.api.getPricing().subscribe({
          next: (config) => {
            this.pricing.set(config);
            this.loading.set(false);
          },
          error: (error: unknown) => {
            this.apiError.set(this.errorMessage(error, 'Could not load pricing configuration.'));
            this.loading.set(false);
          },
        });
      },
      error: (error: unknown) => {
        this.apiError.set(this.errorMessage(error, 'Could not load bookings. Is the local API running?'));
        this.loading.set(false);
      },
    });
  }

  protected openNewBooking(): void {
    this.editingBooking.set(null);
    this.formOpen.set(true);
  }

  protected editBooking(booking: Booking): void {
    this.selectedBooking.set(null);
    this.editingBooking.set(booking);
    this.formOpen.set(true);
  }

  protected selectBooking(booking: Booking): void {
    this.selectedBooking.set(booking);
  }

  protected closeForm(): void {
    this.formOpen.set(false);
    this.editingBooking.set(null);
  }

  protected saveBooking(draft: BookingDraft): void {
    this.savingBooking.set(true);
    const existing = this.editingBooking();
    const request = existing
      ? this.api.updateBooking(existing.id, draft)
      : this.api.createBooking(draft);

    request.subscribe({
      next: () => {
        this.savingBooking.set(false);
        this.closeForm();
        this.notify(existing ? 'Booking changes saved.' : 'Booking added to the list.');
        this.loadData(false);
      },
      error: (error: unknown) => {
        this.savingBooking.set(false);
        this.notify(this.errorMessage(error, 'Could not save this booking.'), true);
      },
    });
  }

  protected changeStatus(event: { booking: Booking; status: BookingStatus }): void {
    this.api.updateBooking(event.booking.id, { ...event.booking, status: event.status }).subscribe({
      next: () => {
        this.notify('Booking status updated.');
        this.loadData(false);
      },
      error: (error: unknown) =>
        this.notify(this.errorMessage(error, 'Could not update the booking status.'), true),
    });
  }

  protected deleteBooking(booking: Booking): void {
    const confirmed = globalThis.confirm(`Delete the booking for ${booking.customerName}?`);
    if (!confirmed) return;

    this.api.deleteBooking(booking.id).subscribe({
      next: () => {
        this.selectedBooking.set(null);
        this.notify('Booking deleted.');
        this.loadData(false);
      },
      error: (error: unknown) =>
        this.notify(this.errorMessage(error, 'Could not delete this booking.'), true),
    });
  }

  protected savePricing(config: PricingConfig): void {
    this.savingPricing.set(true);
    this.api.updatePricing(config).subscribe({
      next: (saved) => {
        this.pricing.set(saved);
        this.savingPricing.set(false);
        this.notify('Pricing configuration saved.');
      },
      error: (error: unknown) => {
        this.savingPricing.set(false);
        this.notify(this.errorMessage(error, 'Could not save pricing configuration.'), true);
      },
    });
  }

  private notify(message: string, isError = false): void {
    this.toast.set(message);
    this.toastError.set(isError);
    globalThis.setTimeout(() => {
      if (this.toast() === message) this.toast.set('');
    }, 4500);
  }

  private errorMessage(error: unknown, fallback: string): string {
    if (error instanceof HttpErrorResponse && typeof error.error?.error === 'string') {
      return `${fallback} ${error.error.error}`;
    }
    return error instanceof Error ? `${fallback} ${error.message}` : fallback;
  }
}
