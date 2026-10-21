import { FormControl, FormGroup } from '@angular/forms';
import {
  bookingDateNotInPast,
  customerNameLength,
  philippineContactNumber,
  pickupDateOnOrAfterBooking,
  trimmedRequired,
  weightWithinLimits,
} from './booking.validators';

describe('booking validators', () => {
  it('rejects blank names and names outside the trimmed length range', () => {
    const required = trimmedRequired();
    const length = customerNameLength(2, 70);
    expect(required(new FormControl('   '))).toEqual({ required: true });
    expect(length(new FormControl(' A '))).toEqual({
      nameLength: { minimum: 2, maximum: 70, actual: 1 },
    });
    expect(length(new FormControl('Laundry customer'))).toBeNull();
  });

  it('accepts common Philippine mobile and landline formats', () => {
    const validator = philippineContactNumber();
    expect(validator(new FormControl('0917 123 4567'))).toBeNull();
    expect(validator(new FormControl('+63 917-123-4567'))).toBeNull();
    expect(validator(new FormControl('(02) 8123-4567'))).toBeNull();
  });

  it('rejects malformed Philippine contact numbers', () => {
    const validator = philippineContactNumber();
    expect(validator(new FormControl('call me'))).toEqual({ philippinePhone: true });
    expect(validator(new FormControl('+63 123'))).toEqual({ philippinePhone: true });
  });

  it('requires positive weight inside the configured demo range', () => {
    const validator = weightWithinLimits(0.1, 30);
    expect(validator(new FormControl(0))).toEqual({ weightPositive: true });
    expect(validator(new FormControl(0.05))).toEqual({
      weightRange: { minimumKg: 0.1, maximumKg: 30, actual: 0.05 },
    });
    expect(validator(new FormControl(31))).toEqual({
      weightRange: { minimumKg: 0.1, maximumKg: 30, actual: 31 },
    });
    expect(validator(new FormControl(5))).toBeNull();
  });

  it('rejects a booking date earlier than today', () => {
    const validator = bookingDateNotInPast('2026-10-21');
    expect(validator(new FormControl('2026-10-20'))).toEqual({ bookingDateInPast: true });
    expect(validator(new FormControl('2026-10-21'))).toBeNull();
    expect(validator(new FormControl('2026-10-22'))).toBeNull();
  });

  it('requires pickup on or after booking date', () => {
    const validator = pickupDateOnOrAfterBooking();
    const form = new FormGroup({
      bookingDate: new FormControl('2026-10-21'),
      pickupDate: new FormControl('2026-10-20'),
    });
    expect(validator(form)).toEqual({ pickupBeforeBooking: true });
    form.controls['pickupDate'].setValue('2026-10-21');
    expect(validator(form)).toBeNull();
  });
});
