import { CurrencyPipe } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Booking, BookingDraft, PricingConfig, RateType } from '../models/booking';
import { PricingService } from '../services/pricing.service';
import {
  bookingDateNotInPast,
  customerNameLength,
  localDateString,
  philippineContactNumber,
  pickupDateOnOrAfterBooking,
  trimmedRequired,
  weightWithinLimits,
} from '../validators/booking.validators';

@Component({
  imports: [CurrencyPipe, ReactiveFormsModule],
  selector: 'app-booking-form',
  styleUrl: './booking-form.component.css',
  templateUrl: './booking-form.component.html',
})
export class BookingFormComponent implements OnChanges {
  private readonly formBuilder = inject(FormBuilder);
  protected readonly pricingService = inject(PricingService);

  @Input() booking: Booking | null = null;
  @Input({ required: true }) pricing!: PricingConfig;
  @Input() saving = false;
  @Output() saveBooking = new EventEmitter<BookingDraft>();
  @Output() cancel = new EventEmitter<void>();

  protected submitted = false;
  protected readonly today = localDateString();
  protected readonly form = this.formBuilder.nonNullable.group(
    {
      customerName: ['', [trimmedRequired(), customerNameLength(2, 70)]],
      contactNumber: ['', [trimmedRequired(), philippineContactNumber()]],
      serviceId: ['', Validators.required],
      rateType: ['regular' as RateType, Validators.required],
      weightKg: [1, [Validators.required, weightWithinLimits(0.1, 30)]],
      express: [false],
      bookingDate: [this.today, [Validators.required, bookingDateNotInPast(this.today)]],
      pickupDate: [this.today, Validators.required],
      notes: ['', Validators.maxLength(500)],
    },
    { validators: pickupDateOnOrAfterBooking() },
  );

  get selectedService() {
    return this.pricing.services.find((service) => service.id === this.form.controls.serviceId.value);
  }

  get selectedRateLabel(): string {
    const service = this.selectedService;
    if (!service) return 'Select a service';
    return this.form.controls.rateType.value === 'promo' && service.promoRate !== null
      ? service.promoLabel
      : service.regularLabel;
  }

  get selectedRate(): number | null {
    const service = this.selectedService;
    if (!service) return null;
    return this.form.controls.rateType.value === 'promo' && service.promoRate !== null
      ? service.promoRate
      : service.regularRate;
  }

  get estimate() {
    return this.pricingService.estimate(this.form.getRawValue(), this.pricing);
  }

  ngOnChanges(): void {
    if (!this.pricing || !this.form) return;
    this.form.controls.weightKg.setValidators([
      Validators.required,
      weightWithinLimits(this.pricing.weightLimits.minimumKg, this.pricing.weightLimits.maximumKg),
    ]);
    this.form.controls.weightKg.updateValueAndValidity({ emitEvent: false });
  }

  ngOnInit(): void {
    const service = this.booking
      ? this.pricing.services.find((item) => item.id === this.booking?.serviceId)
      : this.pricing.services[0];

    this.form.patchValue({
      customerName: this.booking?.customerName ?? '',
      contactNumber: this.booking?.contactNumber ?? '',
      serviceId: this.booking?.serviceId ?? service?.id ?? '',
      rateType: this.booking?.rateType ?? (service?.promoRate === null ? 'regular' : 'promo'),
      weightKg: this.booking?.weightKg ?? 1,
      express: this.booking?.express ?? false,
      bookingDate: this.booking?.bookingDate ?? this.today,
      pickupDate: this.booking?.pickupDate ?? this.today,
      notes: this.booking?.notes ?? '',
    });
    this.onServiceChange();
  }

  protected onServiceChange(): void {
    if (this.selectedService && this.selectedService.promoRate === null) {
      this.form.controls.rateType.setValue('regular');
      this.form.controls.rateType.disable();
    } else {
      this.form.controls.rateType.enable();
    }
  }

  protected submit(): void {
    this.submitted = true;
    this.form.markAllAsTouched();
    if (this.form.invalid || this.saving) return;

    const value = this.form.getRawValue();
    this.saveBooking.emit({
      ...value,
      customerName: value.customerName.trim(),
      contactNumber: value.contactNumber.trim(),
      status: this.booking?.status ?? 'Received',
      weightKg: Number(value.weightKg),
      charge: this.estimate,
    });
  }
}
