import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { App } from './app';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    })
      .compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should render the overview after bookings and pricing load', () => {
    const fixture = TestBed.createComponent(App);
    const http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();

    http.expectOne('http://127.0.0.1:3000/api/bookings').flush({ bookings: [], demoData: false });
    http.expectOne('http://127.0.0.1:3000/api/pricing').flush({
      services: [],
      express: { enabled: false, label: 'Express', amount: 0, unit: 'flat' },
      weightLimits: { minimumKg: 0.1, maximumKg: 30 },
    });
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('The washline');
  });
});
