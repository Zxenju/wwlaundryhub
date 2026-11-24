import { CurrencyPipe, DatePipe, DecimalPipe } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Booking, BookingStatus } from '../models/booking';

@Component({
  imports: [CurrencyPipe, DatePipe, DecimalPipe, FormsModule],
  selector: 'app-daily-report',
  styleUrl: './daily-report.component.css',
  templateUrl: './daily-report.component.html',
})
export class DailyReportComponent {
  @Input({ required: true }) bookings: Booking[] = [];
  @Output() selectBooking = new EventEmitter<Booking>();
  @Output() showBookings = new EventEmitter<void>();

  protected readonly today = this.localDate();
  protected readonly dateLabel = new Date(`${this.today}T12:00:00`);
  protected readonly workStatuses: BookingStatus[] = ['Received', 'Washing', 'Drying'];
  protected readonly allStatuses: BookingStatus[] = [
    'Received', 'Washing', 'Drying', 'Ready for Pickup', 'Completed',
  ];
  protected rangeChoice: '7d' | '30d' | 'month' | 'all' | 'custom' = '30d';
  protected customStart = this.dateOffset(-29);
  protected customEnd = this.today;

  get reportRangeStart(): string {
    switch (this.rangeChoice) {
      case '7d': return this.dateOffset(-6);
      case '30d': return this.dateOffset(-29);
      case 'month': return `${this.today.slice(0, 7)}-01`;
      case 'all': return this.bookings.reduce(
        (oldest, booking) => booking.bookingDate < oldest ? booking.bookingDate : oldest,
        this.today,
      );
      case 'custom': return this.customStart;
    }
  }

  get reportRangeEnd(): string {
    return this.rangeChoice === 'custom' ? this.customEnd : this.today;
  }

  get reportBookings(): Booking[] {
    return this.bookings.filter((booking) =>
      booking.bookingDate >= this.reportRangeStart && booking.bookingDate <= this.reportRangeEnd,
    );
  }

  get validReportRange(): boolean {
    return this.reportRangeStart <= this.reportRangeEnd;
  }

  get reportWeightKg(): number {
    return this.reportBookings.reduce((total, booking) => total + booking.weightKg, 0);
  }

  get estimatedCharges(): number {
    return this.reportBookings.reduce((total, booking) => total + (booking.charge.totalAmount ?? 0), 0);
  }

  get bookingsWithEstimate(): number {
    return this.reportBookings.filter((booking) => booking.charge.totalAmount !== null).length;
  }

  get paymentsInPeriod(): Booking[] {
    return this.bookings.filter((booking) => {
      const paidDate = booking.payment?.paidAt?.slice(0, 10);
      return booking.payment?.status === 'Paid' && !!paidDate
        && paidDate >= this.reportRangeStart && paidDate <= this.reportRangeEnd;
    });
  }

  get collectedInPeriod(): number {
    return this.paymentsInPeriod.reduce((total, booking) => total + (booking.payment?.amount ?? 0), 0);
  }

  get statusBreakdown(): { status: BookingStatus; count: number; percent: number }[] {
    return this.allStatuses.map((status) => {
      const count = this.reportBookings.filter((booking) => booking.status === status).length;
      return {
        status,
        count,
        percent: this.reportBookings.length ? Math.round((count / this.reportBookings.length) * 100) : 0,
      };
    });
  }

  get serviceBreakdown(): { name: string; count: number; weightKg: number; charges: number }[] {
    const totals = new Map<string, { count: number; weightKg: number; charges: number }>();
    for (const booking of this.reportBookings) {
      const row = totals.get(booking.charge.serviceName) ?? { count: 0, weightKg: 0, charges: 0 };
      row.count += 1;
      row.weightKg += booking.weightKg;
      row.charges += booking.charge.totalAmount ?? 0;
      totals.set(booking.charge.serviceName, row);
    }
    return [...totals.entries()]
      .map(([name, row]) => ({ name, ...row }))
      .sort((left, right) => right.count - left.count || left.name.localeCompare(right.name));
  }

  get trendGrouping(): 'day' | 'week' | 'month' {
    const days = this.rangeLengthDays;
    return days <= 14 ? 'day' : days <= 90 ? 'week' : 'month';
  }

  get trendPoints(): { start: string; label: string; bookings: number; charges: number; collections: number }[] {
    if (!this.validReportRange) return [];
    const chartStart = this.rangeLengthDays > 365
      ? this.firstDayOfMonthOffset(this.reportRangeEnd, -11)
      : this.reportRangeStart;
    const start = this.bucketStart(chartStart, this.trendGrouping);
    const points = new Map<string, { start: string; label: string; bookings: number; charges: number; collections: number }>();
    const cursor = new Date(`${start}T12:00:00`);
    const last = new Date(`${this.reportRangeEnd}T12:00:00`);

    while (cursor <= last && points.size < 370) {
      const key = this.localDate(cursor);
      points.set(key, {
        start: key,
        label: this.trendGrouping === 'month'
          ? new Intl.DateTimeFormat('en', { month: 'short', year: '2-digit' }).format(cursor)
          : this.trendGrouping === 'week'
            ? new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' }).format(cursor)
            : new Intl.DateTimeFormat('en', { weekday: 'short', day: 'numeric' }).format(cursor),
        bookings: 0,
        charges: 0,
        collections: 0,
      });
      cursor.setDate(cursor.getDate() + (this.trendGrouping === 'day' ? 1 : this.trendGrouping === 'week' ? 7 : 0));
      if (this.trendGrouping === 'month') cursor.setMonth(cursor.getMonth() + 1);
    }

    for (const booking of this.reportBookings) {
      if (booking.bookingDate < chartStart) continue;
      const point = points.get(this.bucketStart(booking.bookingDate, this.trendGrouping));
      if (!point) continue;
      point.bookings += 1;
      point.charges += booking.charge.totalAmount ?? 0;
    }
    for (const booking of this.paymentsInPeriod) {
      const paidDate = booking.payment?.paidAt?.slice(0, 10);
      if (!paidDate || paidDate < chartStart) continue;
      const point = points.get(this.bucketStart(paidDate, this.trendGrouping));
      if (point) point.collections += booking.payment?.amount ?? 0;
    }
    return [...points.values()];
  }

  get maxTrendBookings(): number {
    return Math.max(1, ...this.trendPoints.map((point) => point.bookings));
  }

  get maxTrendCollections(): number {
    return Math.max(1, ...this.trendPoints.map((point) => point.collections));
  }

  protected trendX(index: number): number {
    const count = this.trendPoints.length;
    return count <= 1 ? 341 : 70 + (558 * index) / (count - 1);
  }

  protected trendTicks(metric: 'bookings' | 'collections'): number[] {
    const maximum = metric === 'bookings' ? this.maxTrendBookings : this.maxTrendCollections;
    const roughStep = maximum / 4;
    const magnitude = 10 ** Math.floor(Math.log10(Math.max(roughStep, 1)));
    const normalized = roughStep / magnitude;
    const niceStep = (normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10) * magnitude;
    const ceiling = Math.max(niceStep, Math.ceil(maximum / niceStep) * niceStep);
    return Array.from({ length: Math.round(ceiling / niceStep) + 1 }, (_, index) => index * niceStep);
  }

  protected trendY(value: number, metric: 'bookings' | 'collections'): number {
    const ticks = this.trendTicks(metric);
    const ceiling = ticks[ticks.length - 1] || 1;
    return 174 - (value / ceiling) * 128;
  }

  protected trendPointLabelY(value: number, metric: 'bookings' | 'collections'): number {
    return Math.max(35, this.trendY(value, metric) - 10);
  }

  protected trendLinePath(metric: 'bookings' | 'collections'): string {
    return this.trendPoints.map((point, index) => {
      const value = metric === 'bookings' ? point.bookings : point.collections;
      return `${index === 0 ? 'M' : 'L'} ${this.trendX(index)} ${this.trendY(value, metric)}`;
    }).join(' ');
  }

  protected trendAreaPath(metric: 'bookings' | 'collections'): string {
    const points = this.trendPoints.map((point, index) => {
      const value = metric === 'bookings' ? point.bookings : point.collections;
      return `${this.trendX(index)} ${this.trendY(value, metric)}`;
    });
    if (!points.length) return '';
    return `M ${this.trendX(0)} 174 L ${points.join(' L ')} L ${this.trendX(points.length - 1)} 174 Z`;
  }

  protected trendDescription(metric: 'bookings' | 'collections'): string {
    const label = metric === 'bookings' ? 'Bookings' : 'Payments collected';
    return `${label}: ${this.trendPoints.map((point) => `${point.label}, ${metric === 'bookings' ? point.bookings : point.collections}`).join('; ')}`;
  }

  get trendWindowLabel(): string {
    return this.rangeLengthDays > 365
      ? 'Latest 12 months of selected period'
      : 'Bookings by booking date · payments by payment date';
  }

  get pickupsDueToday(): Booking[] {
    return this.bookings
      .filter((booking) => booking.status !== 'Completed' && booking.pickupDate === this.today)
      .sort((left, right) => left.pickupDate.localeCompare(right.pickupDate)
        || left.customerName.localeCompare(right.customerName));
  }

  get readyForPickup(): Booking[] {
    return this.bookings
      .filter((booking) => booking.status === 'Ready for Pickup')
      .sort((left, right) => left.pickupDate.localeCompare(right.pickupDate)
        || left.customerName.localeCompare(right.customerName));
  }

  get overduePickups(): number {
    return this.readyForPickup.filter((booking) => booking.pickupDate < this.today).length;
  }

  get activeWork(): Booking[] {
    return this.bookings.filter((booking) => this.workStatuses.includes(booking.status));
  }

  get activeWeightKg(): number {
    return this.activeWork.reduce((total, booking) => total + booking.weightKg, 0);
  }

  protected countAt(status: BookingStatus): number {
    return this.bookings.filter((booking) => booking.status === status).length;
  }

  protected weightAt(status: BookingStatus): number {
    return this.bookings
      .filter((booking) => booking.status === status)
      .reduce((total, booking) => total + booking.weightKg, 0);
  }

  protected printReport(): void {
    globalThis.window.print();
  }

  protected exportCsv(): void {
    const bookingRows = this.reportBookings.map((booking) => [
      booking.customerName,
      booking.contactNumber,
      booking.charge.serviceName,
      booking.bookingDate,
      booking.pickupDate,
      booking.status,
      booking.weightKg.toFixed(2),
      booking.charge.rateLabel,
      booking.charge.rateAmount.toFixed(2),
      booking.charge.totalAmount?.toFixed(2) ?? '',
      booking.payment?.status ?? 'Unpaid',
      booking.payment?.method ?? '',
      booking.payment?.paidAt ?? '',
      booking.payment?.amount?.toFixed(2) ?? '',
      booking.express ? 'Yes' : 'No',
    ]);
    const rows: (string | number)[][] = [
      ['Wash-up Wash-up Laundry Hub'],
      ['Booking report', this.reportRangeStart, this.reportRangeEnd],
      [],
      ['Summary'],
      ['Bookings', this.reportBookings.length],
      ['Laundry weight (kg)', this.reportWeightKg.toFixed(2)],
      ['Estimated charges (PHP)', this.estimatedCharges.toFixed(2)],
      ['Payments collected in period (PHP)', this.collectedInPeriod.toFixed(2)],
      ['Payments recorded in period', this.paymentsInPeriod.length],
      [],
      ['Bookings by booking date'],
      ['Customer', 'Contact', 'Service', 'Booking date', 'Pickup date', 'Current status', 'Weight (kg)', 'Rate label', 'Rate (PHP)', 'Estimated charge (PHP)', 'Payment status', 'Payment method', 'Paid at', 'Paid amount (PHP)', 'Express'],
      ...bookingRows,
      [],
      ['Payments received by payment date'],
      ['Customer', 'Contact', 'Service', 'Paid at', 'Method', 'Amount (PHP)'],
      ...this.paymentsInPeriod.map((booking) => [
        booking.customerName,
        booking.contactNumber,
        booking.charge.serviceName,
        booking.payment?.paidAt ?? '',
        booking.payment?.method ?? '',
        booking.payment?.amount?.toFixed(2) ?? '',
      ]),
    ];
    const csv = `\uFEFF${rows.map((row) => row.map((value) => this.csvCell(value)).join(',')).join('\r\n')}`;
    const url = globalThis.URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const link = globalThis.document.createElement('a');
    link.href = url;
    link.download = `wash-up-report-${this.reportRangeStart}-to-${this.reportRangeEnd}.csv`;
    link.click();
    globalThis.URL.revokeObjectURL(url);
  }

  private dateOffset(days: number): string {
    return this.offsetDate(this.today, days);
  }

  private offsetDate(value: string, days: number): string {
    const date = new Date(`${value}T12:00:00`);
    date.setDate(date.getDate() + days);
    return this.localDate(date);
  }

  private firstDayOfMonthOffset(value: string, months: number): string {
    const date = new Date(`${value}T12:00:00`);
    date.setDate(1);
    date.setMonth(date.getMonth() + months);
    return this.localDate(date);
  }

  private localDate(date = new Date()): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private bucketStart(value: string, grouping: 'day' | 'week' | 'month'): string {
    const date = new Date(`${value}T12:00:00`);
    if (grouping === 'month') date.setDate(1);
    if (grouping === 'week') date.setDate(date.getDate() - ((date.getDay() + 6) % 7));
    return this.localDate(date);
  }

  private get rangeLengthDays(): number {
    const start = new Date(`${this.reportRangeStart}T12:00:00`);
    const end = new Date(`${this.reportRangeEnd}T12:00:00`);
    return Math.max(0, Math.floor((end.getTime() - start.getTime()) / 86_400_000) + 1);
  }

  private csvCell(value: string | number): string {
    let safe = String(value);
    if (/^[\s]*[=+@\-]/.test(safe)) safe = `'${safe}`;
    return `"${safe.replaceAll('"', '""')}"`;
  }
}

