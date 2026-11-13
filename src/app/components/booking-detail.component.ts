import { CurrencyPipe, DatePipe, DecimalPipe } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Booking, BookingStatus, PaymentMethod, PricingConfig } from '../models/booking';

@Component({
  imports: [CurrencyPipe, DatePipe, DecimalPipe, FormsModule],
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
  @Output() changePayment = new EventEmitter<{ booking: Booking; paid: boolean; method?: PaymentMethod }>();

  protected readonly paymentMethods: PaymentMethod[] = ['Cash', 'GCash', 'Maya', 'Bank transfer', 'Other'];
  protected selectedPaymentMethod: PaymentMethod = 'Cash';

  get pricingUnitLabel(): string {
    switch (this.booking.charge.billingUnit) {
      case 'per-kg':
        return 'per kg';
      case 'per-load':
        return 'per load';
      case 'flat':
        return 'flat amount';
    }
  }

  get bookingReference(): string {
    return this.booking.id.slice(0, 8).toUpperCase();
  }

  protected printReceipt(): void {
    globalThis.window.print();
  }

  protected recordPayment(): void {
    this.changePayment.emit({ booking: this.booking, paid: true, method: this.selectedPaymentMethod });
  }

  protected markUnpaid(): void {
    this.changePayment.emit({ booking: this.booking, paid: false });
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
