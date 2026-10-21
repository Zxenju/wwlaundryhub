import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

export function trimmedRequired(): ValidatorFn {
  return (control: AbstractControl<string>): ValidationErrors | null =>
    control.value.trim() ? null : { required: true };
}

export function customerNameLength(minimum: number, maximum: number): ValidatorFn {
  return (control: AbstractControl<string>): ValidationErrors | null => {
    const length = control.value.trim().length;
    if (!length) return null;
    return length < minimum || length > maximum
      ? { nameLength: { minimum, maximum, actual: length } }
      : null;
  };
}

export function philippineContactNumber(): ValidatorFn {
  return (control: AbstractControl<string>): ValidationErrors | null => {
    const value = control.value.trim();
    if (!value) return null;
    if (!/^[+0-9().\-\s]+$/.test(value)) return { philippinePhone: true };

    const compact = value.replace(/[().\-\s]/g, '');
    let nationalNumber = compact;
    if (compact.startsWith('+63')) {
      nationalNumber = `0${compact.slice(3)}`;
    } else if (compact.startsWith('63')) {
      nationalNumber = `0${compact.slice(2)}`;
    }

    return /^0\d{7,10}$/.test(nationalNumber) ? null : { philippinePhone: true };
  };
}

export function weightWithinLimits(minimumKg: number, maximumKg: number): ValidatorFn {
  return (control: AbstractControl<number | null>): ValidationErrors | null => {
    const value = control.value;
    if (value === null || value === undefined || Number.isNaN(value)) return null;
    if (value <= 0) return { weightPositive: true };
    if (value < minimumKg || value > maximumKg) {
      return { weightRange: { minimumKg, maximumKg, actual: value } };
    }
    return null;
  };
}

export function bookingDateNotInPast(today = localDateString()): ValidatorFn {
  return (control: AbstractControl<string>): ValidationErrors | null => {
    const value = control.value;
    if (!value) return null;
    return value >= today ? null : { bookingDateInPast: true };
  };
}

export function pickupDateOnOrAfterBooking(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const bookingDate = control.get('bookingDate')?.value as string | undefined;
    const pickupDate = control.get('pickupDate')?.value as string | undefined;
    if (!bookingDate || !pickupDate) return null;
    return pickupDate >= bookingDate ? null : { pickupBeforeBooking: true };
  };
}

export function localDateString(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}
