import { TestBed } from '@angular/core/testing';
import { PricingConfig } from '../models/booking';
import { PricingService } from './pricing.service';

const config: PricingConfig = {
  services: [{
    id: 'wash-fold',
    name: 'Wash / Fold',
    promoLabel: 'Promo Rate',
    promoRate: 55,
    regularLabel: 'Regular Rate',
    regularRate: 60,
    billingUnit: 'per-kg',
  }],
  express: {
    enabled: false,
    label: 'Express',
    amount: 0,
    unit: 'flat',
  },
  weightLimits: { minimumKg: 0.1, maximumKg: 30 },
};

describe('PricingService', () => {
  let service: PricingService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PricingService);
  });

  it('calculates a per-kilogram total from the entered weight', () => {
    const estimate = service.estimate(
      { serviceId: 'wash-fold', rateType: 'promo', weightKg: 2, express: false },
      config,
    );
    expect(estimate.rateAmount).toBe(55);
    expect(estimate.billingUnit).toBe('per-kg');
    expect(estimate.totalAmount).toBe(110);
  });

  it('adds an enabled flat express fee to the service total', () => {
    const confirmedConfig = structuredClone(config);
    confirmedConfig.express.enabled = true;
    confirmedConfig.express.amount = 5;
    confirmedConfig.express.unit = 'flat';

    const estimate = service.estimate(
      { serviceId: 'wash-fold', rateType: 'promo', weightKg: 2, express: true },
      confirmedConfig,
    );
    expect(estimate.serviceAmount).toBe(110);
    expect(estimate.expressAmount).toBe(5);
    expect(estimate.totalAmount).toBe(115);
  });
});
