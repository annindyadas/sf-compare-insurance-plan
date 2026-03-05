import { LightningElement, api } from 'lwc';

export default class PlanComparisonResults extends LightningElement {
    @api results;

    /* ---------- Getters ---------- */

    get hasResults() {
        return this.results && this.results.planResults && this.results.planResults.length > 0;
    }

    get planResults() {
        if (!this.hasResults) return [];
        return this.results.planResults.map((plan, index) => ({
            ...plan,
            index,
            rankLabel: this._ordinal(plan.rank),
            cardClass: plan.isCheapest ? 'result-card cheapest' : 'result-card',
            badgeClass: plan.isCheapest ? 'rank-badge cheapest-badge' : 'rank-badge',
            badgeLabel: plan.isCheapest ? '\uD83C\uDFC6 Best Value' : `#${plan.rank}`,
            formattedAnnualPremium: this._formatCurrency(plan.annualPremium),
            formattedPremiumPerPeriod: this._formatCurrency(plan.premiumPerPeriod),
            formattedOopm: '+' + this._formatCurrency(plan.oopm),
            formattedEffectiveCost: this._formatCurrency(plan.effectiveAnnualCost),
            hdhpLabel: plan.isHDHP ? 'HDHP' : 'Non-HDHP',
            hdhpClass: plan.isHDHP ? 'plan-type-badge hdhp' : 'plan-type-badge non-hdhp',
            premiumPeriodLabel: plan.premiumFrequencyLabel,
            annualPremiumLabel: `Annual Premium (\u00d7${plan.periodsPerYear})`,
            // Cost Offset Analysis
            hasOffsetData: plan.taxSavings > 0 || plan.employerHsa > 0 || plan.totalFundsAvailable > 0,
            hasTaxSavings: plan.taxSavings > 0,
            hasEmployerHsa: plan.employerHsa > 0,
            showHsaApplied: plan.hsaApplied > 0,
            showLpfsaApplied: plan.lpfsaApplied > 0,
            showFsaApplied: plan.fsaApplied > 0,
            taxSavingsLabel: plan.taxRate > 0 ? `Tax Savings (${plan.taxRate}%)` : 'Tax Savings',
            formattedNegTaxSavings: '\u2212' + this._formatCurrency(plan.taxSavingsApplied),
            formattedNegEmployerHsa: '\u2212' + this._formatCurrency(plan.employerHsaApplied),
            formattedNegHsaApplied: '\u2212' + this._formatCurrency(plan.hsaApplied),
            formattedNegLpfsaApplied: '\u2212' + this._formatCurrency(plan.lpfsaApplied),
            formattedNegFsaApplied: '\u2212' + this._formatCurrency(plan.fsaApplied),
            // Net Annual Cost — can be negative (leftover funds)
            isNegativeNet: plan.netAnnualCost < 0,
            netCostClass: plan.netAnnualCost < 0 ? 'net-cost-section net-negative' : 'net-cost-section',
            formattedNetAnnualCost: plan.netAnnualCost < 0
                ? '\u2212' + this._formatCurrency(Math.abs(plan.netAnnualCost))
                : this._formatCurrency(plan.netAnnualCost)
        }));
    }

    get cheapestPlanName() {
        return this.results?.cheapestPlanName || '';
    }

    get formattedSavings() {
        return this._formatCurrency(this.results?.savingsVsNext || 0);
    }

    get hasSavings() {
        return (this.results?.savingsVsNext || 0) > 0;
    }

    /* ---------- Private Helpers ---------- */

    _formatCurrency(value) {
        if (value === null || value === undefined) return '$0.00';
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(value);
    }

    _ordinal(n) {
        const s = ['th', 'st', 'nd', 'rd'];
        const v = n % 100;
        return n + (s[(v - 20) % 10] || s[v] || s[0]);
    }
}
