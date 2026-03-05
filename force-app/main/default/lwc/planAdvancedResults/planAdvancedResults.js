import { LightningElement, api } from 'lwc';

export default class PlanAdvancedResults extends LightningElement {
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
            cardClass: plan.isCheapest ? 'result-card cheapest' : 'result-card',
            badgeClass: plan.isCheapest ? 'rank-badge cheapest-badge' : 'rank-badge',
            badgeLabel: plan.isCheapest ? '\uD83C\uDFC6 Best Value' : `#${plan.rank}`,
            hdhpLabel: plan.isHDHP ? 'HDHP' : 'Non-HDHP',
            hdhpClass: plan.isHDHP ? 'plan-type-badge hdhp' : 'plan-type-badge non-hdhp',
            premiumPeriodLabel: plan.premiumFrequencyLabel,
            annualPremiumLabel: `Annual Premium (\u00d7${plan.periodsPerYear})`,
            formattedPremiumPerPeriod: this._fmt(plan.premiumPerPeriod),
            formattedAnnualPremium: this._fmt(plan.annualPremium),
            // Deductible info
            deductibleLabel: this._deductibleLabel(plan),
            oopmLabel: this._oopmLabel(plan),
            formattedDeductible: this._fmt(plan.deductible),
            formattedOopmUsed: this._fmt(plan.oopmUsed),
            // Medical & Rx costs
            formattedMedicalCopays: this._fmt(plan.totalMedicalCopays),
            formattedRxCopays: this._fmt(plan.totalRxCopays),
            formattedRxDeductible: this._fmt(plan.rxDeductible),
            formattedRunningOOP: this._fmt(plan.runningOOP),
            formattedDeductibleApplied: this._fmt(plan.deductibleApplied),
            formattedCoinsuranceCost: this._fmt(plan.coinsuranceCost),
            formattedEstimatedOOP: this._fmt(plan.estimatedOOP),
            formattedOopmCap: this._fmt(plan.oopmUsed),
            formattedCappedOOP: this._fmt(plan.cappedOOP),
            formattedTotalAnnualCost: this._fmt(plan.totalAnnualCost),
            // Offset analysis
            hasOffsetData: plan.totalOffsets > 0,
            showHsa: plan.hsaApplied > 0,
            showEmployerHsa: plan.employerHsaApplied > 0,
            showLpfsa: plan.lpfsaApplied > 0,
            showFsa: plan.fsaApplied > 0,
            hasTaxSavings: plan.taxSavings > 0,
            taxSavingsLabel: plan.taxRate > 0 ? `Tax Savings (${plan.taxRate}%)` : 'Tax Savings',
            formattedNegHsa: '\u2212' + this._fmt(plan.hsaApplied),
            formattedNegEmployerHsa: '\u2212' + this._fmt(plan.employerHsaApplied),
            formattedNegLpfsa: '\u2212' + this._fmt(plan.lpfsaApplied),
            formattedNegFsa: '\u2212' + this._fmt(plan.fsaApplied),
            formattedNegTaxSavings: '\u2212' + this._fmt(plan.taxSavingsApplied),
            // Net cost
            isNegativeNet: plan.netAnnualCost < 0,
            netCostClass: plan.netAnnualCost < 0 ? 'net-cost-section net-negative' : 'net-cost-section',
            formattedNetAnnualCost: plan.netAnnualCost < 0
                ? '\u2212' + this._fmt(Math.abs(plan.netAnnualCost))
                : this._fmt(plan.netAnnualCost),
            // Detail breakdown visibility
            hasMedicalCopays: plan.totalMedicalCopays > 0,
            hasRxCopays: plan.totalRxCopays > 0,
            hasRxDeductible: plan.rxDeductible > 0,
            hasCoinsurance: plan.coinsuranceCost > 0,
            wasCapped: plan.wasCappedAtOopm,
            coinsuranceLabel: `Coinsurance (${plan.coinsuranceRate}%)`,
            deductibleMetLabel: plan.runningOOP >= plan.deductible && plan.deductible > 0
                ? 'Deductible met \u2714' : ''
        }));
    }

    get cheapestPlanName() {
        return this.results?.cheapestPlanName || '';
    }

    get formattedSavings() {
        return this._fmt(this.results?.savingsVsNext || 0);
    }

    get hasSavings() {
        return (this.results?.savingsVsNext || 0) > 0;
    }

    /* ---------- Private Helpers ---------- */

    _fmt(value) {
        if (value === null || value === undefined) return '$0.00';
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(value);
    }

    _deductibleLabel() {
        return 'Plan Deductible';
    }

    _oopmLabel() {
        return 'Out-of-Pocket Max';
    }

    _ordinal(n) {
        const s = ['th', 'st', 'nd', 'rd'];
        const v = n % 100;
        return n + (s[(v - 20) % 10] || s[v] || s[0]);
    }
}
