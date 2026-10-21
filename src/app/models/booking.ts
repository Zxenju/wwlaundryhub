export type BookingStatus =
  | 'Received'
  | 'Washing'
  | 'Drying'
  | 'Ready for Pickup'
  | 'Completed';

export type RateType = 'promo' | 'regular';
export type BillingUnit = 'unconfirmed' | 'per-kg' | 'per-load' | 'flat';
export type ExpressUnit = 'flat' | 'per-kg' | 'per-load';

export interface ServicePricing {
  id: string;
  name: string;
  promoLabel: string;
  promoRate: number | null;
  regularLabel: string;
  regularRate: number;
  billingUnit: BillingUnit;
}

export interface PricingConfig {
  services: ServicePricing[];
  express: {
    enabled: boolean;
    label: string;
    amount: number;
    unit: ExpressUnit;
  };
  weightLimits: {
    minimumKg: number;
    maximumKg: number;
  };
}

export interface ChargeEstimate {
  serviceName: string;
  rateLabel: string;
  rateAmount: number;
  billingUnit: BillingUnit;
  quantity: number | null;
  serviceAmount: number | null;
  expressLabel: string | null;
  expressAmount: number;
  totalAmount: number | null;
  explanation: string;
}

export interface BookingDraft {
  customerName: string;
  contactNumber: string;
  serviceId: string;
  rateType: RateType;
  weightKg: number;
  express: boolean;
  bookingDate: string;
  pickupDate: string;
  notes: string;
  status: BookingStatus;
  charge: ChargeEstimate;
}

export interface Booking extends BookingDraft {
  id: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string | null;
  demoRecord?: boolean;
}

export interface BookingListResponse {
  bookings: Booking[];
  demoData: boolean;
}
