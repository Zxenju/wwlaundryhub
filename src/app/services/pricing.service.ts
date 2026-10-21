import { Injectable } from '@angular/core';
import { BillingUnit, BookingDraft, ChargeEstimate, PricingConfig } from '../models/booking';

@Injectable({ providedIn: 'root' })
export class PricingService {
  estimate(draft: Pick<BookingDraft, 'serviceId' | 'rateType' | 'weightKg' | 'express'>, config: PricingConfig): ChargeEstimate {
    const service = config.services.find((item) => item.id === draft.serviceId);
    if (!service) {
      return {
        serviceName: 'Unknown service',
        rateLabel: 'No matching rate',
        rateAmount: 0,
        billingUnit: 'unconfirmed',
        quantity: null,
        serviceAmount: null,
        expressLabel: null,
        expressAmount: 0,
        totalAmount: null,
        explanation: 'Choose a service to see the configured rate.',
      };
    }

    const rateAmount = draft.rateType === 'promo' && service.promoRate !== null
      ? service.promoRate
      : service.regularRate;
    const rateLabel = draft.rateType === 'promo' && service.promoRate !== null
      ? service.promoLabel
      : service.regularLabel;
    const quantity = this.quantityFor(service.billingUnit, draft.weightKg);
    const serviceAmount = quantity === null ? null : this.roundCurrency(rateAmount * quantity);

    let expressAmount = 0;
    let expressLabel: string | null = null;
    if (draft.express && config.express.enabled) {
      expressLabel = config.express.label;
      const expressQuantity = this.quantityFor(config.express.unit, draft.weightKg);
      if (expressQuantity !== null) {
        expressAmount = this.roundCurrency(config.express.amount * expressQuantity);
      }
    }

    const totalAmount = serviceAmount === null ? null : this.roundCurrency(serviceAmount + expressAmount);
    const explanation = service.billingUnit === 'unconfirmed'
      ? 'The shop sign does not confirm the billing unit. Confirm it with the shop to calculate an amount.'
      : `${rateAmount} × ${quantity} ${this.unitName(service.billingUnit)}${expressAmount ? `, plus ${expressAmount} express` : ''}.`;

    return {
      serviceName: service.name,
      rateLabel,
      rateAmount,
      billingUnit: service.billingUnit,
      quantity,
      serviceAmount,
      expressLabel,
      expressAmount,
      totalAmount,
      explanation,
    };
  }

  unitLabel(unit: BillingUnit): string {
    switch (unit) {
      case 'per-kg':
        return 'per kg';
      case 'per-load':
        return 'per load';
      case 'flat':
        return 'flat amount';
      case 'unconfirmed':
        return 'unit to confirm';
    }
  }

  private quantityFor(unit: BillingUnit | 'per-load', weightKg: number): number | null {
    switch (unit) {
      case 'per-kg':
        return weightKg;
      case 'per-load':
        return 1;
      case 'flat':
        return 1;
      case 'unconfirmed':
        return null;
    }
  }

  private unitName(unit: BillingUnit): string {
    switch (unit) {
      case 'per-kg':
        return 'kg';
      case 'per-load':
        return 'load';
      case 'flat':
        return 'flat amount';
      case 'unconfirmed':
        return 'unit';
    }
  }

  private roundCurrency(amount: number): number {
    return Math.round((amount + Number.EPSILON) * 100) / 100;
  }
}
