import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { Booking, BookingStatus, PricingConfig } from '../models/booking';

@Component({
  imports: [CurrencyPipe, DatePipe],
  selector: 'app-dashboard',
  styleUrl: './dashboard.component.css',
  templateUrl: './dashboard.component.html',
})
export class DashboardComponent implements OnChanges {
  @Input({ required: true }) bookings: Booking[] = [];
  @Input({ required: true }) demoData = false;
  @Input({ required: true }) pricing: PricingConfig = {
    services: [],
    express: { enabled: false, label: '', amount: 0, unit: 'flat' },
    weightLimits: { minimumKg: 0, maximumKg: 0 },
  };
  @Output() showBookings = new EventEmitter<void>();
  @Output() showPricing = new EventEmitter<void>();
  @Output() newBooking = new EventEmitter<void>();
  @Output() selectBooking = new EventEmitter<Booking>();

  protected readonly stations: Array<{ status: BookingStatus; title: string; description: string; icon: string }> = [
    { status: 'Received', title: 'Intake', description: 'At the counter', icon: 'intake' },
    { status: 'Washing', title: 'Washing', description: 'In the washer', icon: 'washer' },
    { status: 'Drying', title: 'Drying', description: 'On the rack or in the dryer', icon: 'drying' },
    { status: 'Ready for Pickup', title: 'Pickup', description: 'Waiting to go home', icon: 'pickup' },
  ];

  private readonly stationQueues = new Map<BookingStatus, Booking[]>();
  private readonly stationPages = new Map<BookingStatus, number>();
  private readonly pageSize = 3;

  ngOnChanges(_changes: SimpleChanges): void {
    this.stationQueues.clear();
    for (const station of this.stations) {
      const queue = this.bookings.filter((booking) => booking.status === station.status);
      queue.sort((left, right) => station.status === 'Ready for Pickup'
        ? left.pickupDate.localeCompare(right.pickupDate) || right.updatedAt.localeCompare(left.updatedAt)
        : right.updatedAt.localeCompare(left.updatedAt));
      this.stationQueues.set(station.status, queue);
      this.stationPages.set(station.status, Math.min(this.currentPage(station.status), this.pageCount(station.status) - 1));
    }
  }

  protected countAt(status: BookingStatus): number {
    return this.stationQueues.get(status)?.length ?? 0;
  }

  protected displayRate(rate: number | null): string {
    return rate === null ? '—' : `₱${rate}`;
  }

  protected stationBookings(status: BookingStatus): Booking[] {
    const page = this.currentPage(status);
    return (this.stationQueues.get(status) ?? []).slice(page * this.pageSize, (page + 1) * this.pageSize);
  }

  protected pageCount(status: BookingStatus): number {
    return Math.max(1, Math.ceil(this.countAt(status) / this.pageSize));
  }

  protected currentPage(status: BookingStatus): number {
    return this.stationPages.get(status) ?? 0;
  }

  protected changePage(status: BookingStatus, offset: number): void {
    const page = this.currentPage(status) + offset;
    if (page >= 0 && page < this.pageCount(status)) this.stationPages.set(status, page);
  }

  protected stationEmptyCopy(status: BookingStatus): string {
    const emptyCopy: Partial<Record<BookingStatus, string>> = {
      Received: 'Nothing waiting at intake.',
      Washing: 'No loads in the washer.',
      Drying: 'The drying rack is clear.',
      'Ready for Pickup': 'No garments ready for pickup.',
    };
    return emptyCopy[status] ?? 'No loads at this station.';
  }

  get todayRevenue(): number {
    if (this.unpricedCompletedTodayCount) return 0;
    return this.bookings
      .filter((booking) => booking.status === 'Completed' && this.completedOnDate(booking.completedAt))
      .reduce((total, booking) => total + (booking.charge.totalAmount ?? 0), 0);
  }

  get unpricedCompletedTodayCount(): number {
    return this.bookings.filter((booking) =>
      booking.status === 'Completed'
      && this.completedOnDate(booking.completedAt)
      && booking.charge.totalAmount === null).length;
  }

  private completedOnDate(value?: string | null): boolean {
    if (!value) return false;
    const completed = new Date(value);
    const today = new Date();
    return completed.getFullYear() === today.getFullYear()
      && completed.getMonth() === today.getMonth()
      && completed.getDate() === today.getDate();
  }

}
