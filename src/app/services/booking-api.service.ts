import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { Booking, BookingDraft, BookingListResponse, PricingConfig } from '../models/booking';

@Injectable({ providedIn: 'root' })
export class BookingApiService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = 'http://127.0.0.1:3000/api';

  getBookings(): Observable<BookingListResponse> {
    return this.http.get<BookingListResponse>(`${this.apiUrl}/bookings`);
  }

  createBooking(draft: BookingDraft): Observable<Booking> {
    return this.http.post<Booking>(`${this.apiUrl}/bookings`, draft);
  }

  updateBooking(id: string, draft: BookingDraft): Observable<Booking> {
    return this.http.put<Booking>(`${this.apiUrl}/bookings/${encodeURIComponent(id)}`, draft);
  }

  deleteBooking(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/bookings/${encodeURIComponent(id)}`);
  }

  getPricing(): Observable<PricingConfig> {
    return this.http.get<PricingConfig>(`${this.apiUrl}/pricing`);
  }

  updatePricing(config: PricingConfig): Observable<PricingConfig> {
    return this.http.put<PricingConfig>(`${this.apiUrl}/pricing`, config);
  }
}
