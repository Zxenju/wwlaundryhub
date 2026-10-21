import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Booking, BookingStatus, PricingConfig } from '../models/booking';

@Component({
  imports: [CurrencyPipe, DatePipe],
  selector: 'app-booking-detail',
  styleUrl: './booking-detail.component.css',
  templateUrl: './booking-detail.component.html',
})
export class BookingDetailComponent {
  @Input({ required: true }) booking!: Booking;
  @Input({ required: true }) pricing!: PricingConfig;
  @Output() close = new EventEmitter<void>();
  @Output() edit = new EventEmitter<Booking>();
  @Output() delete = new EventEmitter<Booking>();

  get pricingUnitLabel(): string {
    switch (this.booking.charge.billingUnit) {
      case 'per-kg':
        return 'per kg';
      case 'per-load':
        return 'per load';
      case 'flat':
        return 'flat amount';
      case 'unconfirmed':
        return 'confirm with shop';
    }
  }

  protected statusDescription(status: BookingStatus): string {
    switch (status) {
      case 'Received':
        return 'Booking received and awaiting work.';
      case 'Washing':
        return 'Laundry is being washed.';
      case 'Drying':
        return 'Laundry is being dried.';
      case 'Ready for Pickup':
        return 'Laundry is ready for customer pickup.';
      case 'Completed':
        return 'Booking has been completed.';
    }
  }
}
