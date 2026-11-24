import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Booking, BookingStatus } from '../models/booking';

@Component({
  imports: [CurrencyPipe, DatePipe, FormsModule],
  selector: 'app-booking-list',
  styleUrl: './booking-list.component.css',
  templateUrl: './booking-list.component.html',
})
export class BookingListComponent {
  @Input({ required: true }) bookings: Booking[] = [];
  @Input() washRippleBookingId: string | null = null;
  @Output() editBooking = new EventEmitter<Booking>();
  @Output() selectBooking = new EventEmitter<Booking>();
  @Output() changeStatus = new EventEmitter<{ booking: Booking; status: BookingStatus }>();
  @Output() deleteBooking = new EventEmitter<Booking>();
  @Output() newBooking = new EventEmitter<void>();
  @Output() openPricing = new EventEmitter<void>();

  protected search = '';
  protected statusFilter: BookingStatus | 'All' = 'All';
  protected currentPage = 1;
  protected readonly pageSize = 10;
  protected readonly statuses: BookingStatus[] = [
    'Received',
    'Washing',
    'Drying',
    'Ready for Pickup',
    'Completed',
  ];

  get filteredBookings(): Booking[] {
    const query = this.search.trim().toLowerCase();
    return this.bookings.filter((booking) => {
      const matchesQuery = !query
        || booking.customerName.toLowerCase().includes(query)
        || booking.contactNumber.toLowerCase().includes(query)
        || booking.charge.serviceName.toLowerCase().includes(query);
      const matchesStatus = this.statusFilter === 'All' || booking.status === this.statusFilter;
      return matchesQuery && matchesStatus;
    });
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.filteredBookings.length / this.pageSize));
  }

  get pageIndex(): number {
    return Math.min(this.currentPage, this.totalPages);
  }

  get pageBookings(): Booking[] {
    const start = (this.pageIndex - 1) * this.pageSize;
    return this.filteredBookings.slice(start, start + this.pageSize);
  }

  get firstVisibleBooking(): number {
    return this.filteredBookings.length ? (this.pageIndex - 1) * this.pageSize + 1 : 0;
  }

  get lastVisibleBooking(): number {
    return Math.min(this.pageIndex * this.pageSize, this.filteredBookings.length);
  }

  protected setSearch(value: string): void {
    this.search = value;
    this.currentPage = 1;
  }

  protected setStatusFilter(status: BookingStatus | 'All'): void {
    this.statusFilter = status;
    this.currentPage = 1;
  }

  protected previousPage(): void {
    this.currentPage = Math.max(1, this.pageIndex - 1);
  }

  protected nextPage(): void {
    this.currentPage = Math.min(this.totalPages, this.pageIndex + 1);
  }

  get hasPricedBookings(): boolean {
    return this.bookings.some((booking) => booking.charge.totalAmount !== null);
  }

  protected countAt(status: BookingStatus): number {
    return this.bookings.filter((booking) => booking.status === status).length;
  }

  protected isBookingStatus(value: string): value is BookingStatus {
    return this.statuses.includes(value as BookingStatus);
  }

  protected updateStatus(booking: Booking, value: string): void {
    if (this.isBookingStatus(value) && value !== booking.status) {
      this.changeStatus.emit({ booking, status: value });
    }
  }

}

