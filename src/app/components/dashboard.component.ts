import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Booking, BookingStatus, PricingConfig, ServicePricing } from '../models/booking';

@Component({
  imports: [CurrencyPipe, DatePipe],
  selector: 'app-dashboard',
  styleUrl: './dashboard.component.css',
  templateUrl: './dashboard.component.html',
})
export class DashboardComponent {
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

  protected readonly washline: Array<{ status: BookingStatus; description: string }> = [
    { status: 'Received', description: 'New at the counter' },
    { status: 'Washing', description: 'In the washer' },
    { status: 'Drying', description: 'In the dryer' },
    { status: 'Ready for Pickup', description: 'Waiting to go home' },
  ];

  get totalActiveLoads(): number {
    return this.bookings.filter((booking) => booking.status !== 'Completed').length;
  }

  protected countAt(status: BookingStatus): number {
    return this.bookings.filter((booking) => booking.status === status).length;
  }

  protected displayRate(rate: number | null): string {
    return rate === null ? '—' : `₱${rate}`;
  }

  get inProgressCount(): number {
    return this.bookings.filter((booking) => ['Washing', 'Drying'].includes(booking.status)).length;
  }

  get readyCount(): number {
    return this.bookings.filter((booking) => booking.status === 'Ready for Pickup').length;
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

  get recentBookings(): Booking[] {
    return [...this.bookings]
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
      .slice(0, 5);
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
