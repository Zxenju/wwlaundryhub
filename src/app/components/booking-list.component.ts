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
  @Output() editBooking = new EventEmitter<Booking>();
  @Output() selectBooking = new EventEmitter<Booking>();
  @Output() changeStatus = new EventEmitter<{ booking: Booking; status: BookingStatus }>();
  @Output() deleteBooking = new EventEmitter<Booking>();
  @Output() newBooking = new EventEmitter<void>();
  @Output() openPricing = new EventEmitter<void>();

  protected search = '';
  protected statusFilter: BookingStatus | 'All' = 'All';
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
