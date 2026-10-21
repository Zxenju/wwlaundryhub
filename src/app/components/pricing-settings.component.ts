import { Component, EventEmitter, Input, OnChanges, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { BillingUnit, PricingConfig } from '../models/booking';

@Component({
  imports: [FormsModule],
  selector: 'app-pricing-settings',
  styleUrl: './pricing-settings.component.css',
  templateUrl: './pricing-settings.component.html',
})
export class PricingSettingsComponent implements OnChanges {
  @Input({ required: true }) config!: PricingConfig;
  @Input() saving = false;
  @Output() saveConfig = new EventEmitter<PricingConfig>();

  protected draft!: PricingConfig;
  protected readonly billingUnits: { value: BillingUnit; label: string }[] = [
    { value: 'unconfirmed', label: 'Unit unconfirmed — confirm with shop' },
    { value: 'per-kg', label: 'Per kilogram' },
    { value: 'per-load', label: 'Per load' },
    { value: 'flat', label: 'Flat amount' },
  ];

  ngOnChanges(): void {
    if (this.config) this.draft = structuredClone(this.config);
  }

  protected get valid(): boolean {
    return this.draft.services.length > 0
      && this.draft.services.every((service) =>
        service.name.trim().length > 0
        && service.regularLabel.trim().length > 0
        && service.regularRate >= 0
        && (service.promoRate === null || service.promoRate >= 0)
        && (service.promoRate === null || service.promoLabel.trim().length > 0))
      && this.draft.weightLimits.minimumKg > 0
      && this.draft.weightLimits.maximumKg >= this.draft.weightLimits.minimumKg
      && this.draft.express.amount >= 0
      && this.draft.express.label.trim().length > 0;
  }

  protected save(): void {
    if (!this.valid || this.saving) return;
    this.saveConfig.emit(structuredClone(this.draft));
  }
}
