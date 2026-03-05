/**
 * planCalcEngine – Pure JS utility module (no template)
 * Encapsulates all cost calculation logic for plan comparison.
 *
 * ===== BASIC MODE =====
 *   Annual Premium          = premium × periods
 *   Effective Annual Cost    = Annual Premium + OOPM  (worst-case)
 *   Offsets                  = HSA + Employer HSA + LP-FSA + FSA + Tax Savings
 *   Net Annual Cost          = Effective Annual Cost − offsets
 *
 * ===== ADVANCED MODE =====
 *   How US health insurance cost-sharing actually works:
 *
 *   1. COPAYS are flat fees paid at time of service, often BEFORE or
 *      regardless of the deductible. They count toward OOPM.
 *
 *   2. Services WITHOUT a copay (copay = $0 or blank) are subject to the
 *      DEDUCTIBLE — you pay the full allowed amount until deductible is met.
 *      Since we don't know the "allowed amount," we let the user enter
 *      estimated costs for these services directly in the copay field,
 *      or leave blank (= $0 cost for that service).
 *
 *   3. Once the DEDUCTIBLE is met, COINSURANCE kicks in — you pay your
 *      share (e.g., 20%) on any remaining costs beyond copays.
 *
 *   4. RX DEDUCTIBLE is separate. You pay full drug prices until you meet
 *      the Rx deductible, THEN Rx copays apply. So Rx copays entered are
 *      what you pay per fill AFTER the Rx deductible is met.
 *
 *   5. All copays + deductible + coinsurance count toward OOPM.
 *      Once OOPM is reached, insurance pays 100%.
 *
 *   Calculation flow:
 *     totalCopays       = sum(copay × visits) for medical services
 *     totalRxCopays     = sum(rx_copay × fills) for prescriptions
 *     runningOOP        = totalCopays + rxDeductible + totalRxCopays
 *                         (copays count toward deductible spend)
 *     deductibleRemaining = max(0, deductible − runningOOP)
 *                         (if copays already exceeded deductible, it's met)
 *     coinsuranceBasis  = costs above deductible that aren't flat copays
 *                         (estimated as: runningOOP − deductible when runningOOP > deductible)
 *     coinsuranceCost   = coinsuranceBasis × coinsurance%
 *     estimatedOOP      = runningOOP + coinsuranceCost
 *     cappedOOP         = min(estimatedOOP, OOPM)
 *     totalAnnualCost   = annualPremium + cappedOOP
 *     offsets & net     = same as Basic mode
 */

// ---------------------------------------------------------------------------
// IRS Contribution Limits (indexed by year, individual)
// Source: IRS Rev. Proc. — updated annually
// ---------------------------------------------------------------------------
const IRS_LIMITS = {
    2024: { hsaIndividual: 4150, hsaFamily: 8300, fsaMax: 3200, lpfsaMax: 3200 },
    2025: { hsaIndividual: 4300, hsaFamily: 8750, fsaMax: 3300, lpfsaMax: 3300 },
    2026: { hsaIndividual: 4400, hsaFamily: 8850, fsaMax: 3400, lpfsaMax: 3400 }
};

/**
 * Returns IRS limits for a given year. Falls back to 2026 if unknown.
 */
export function getIrsLimits(year) {
    return IRS_LIMITS[year] || IRS_LIMITS[2026];
}

/**
 * Validates a single plan's inputs for Basic mode.
 * Returns an object { valid: bool, errors: string[] }
 */
export function validateBasicPlan(plan) {
    const errors = [];
    if (!plan.name || plan.name.trim() === '') {
        errors.push('Plan name is required.');
    }
    if (plan.premium === '' || plan.premium === null || plan.premium === undefined || Number(plan.premium) < 0) {
        errors.push('Premium must be zero or a positive number.');
    }
    if (plan.oopm === '' || plan.oopm === null || plan.oopm === undefined || Number(plan.oopm) < 0) {
        errors.push('Out-of-Pocket Maximum must be zero or a positive number.');
    }
    if (plan.isHDHP) {
        if (plan.hsa !== '' && plan.hsa !== null && plan.hsa !== undefined && Number(plan.hsa) < 0) {
            errors.push('HSA contribution cannot be negative.');
        }
        if (plan.employerHsa !== '' && plan.employerHsa !== null && plan.employerHsa !== undefined && Number(plan.employerHsa) < 0) {
            errors.push('Employer HSA contribution cannot be negative.');
        }
        if (plan.lpfsa !== '' && plan.lpfsa !== null && plan.lpfsa !== undefined && Number(plan.lpfsa) < 0) {
            errors.push('LP-FSA contribution cannot be negative.');
        }
    } else {
        if (plan.fsa !== '' && plan.fsa !== null && plan.fsa !== undefined && Number(plan.fsa) < 0) {
            errors.push('FSA contribution cannot be negative.');
        }
    }
    return { valid: errors.length === 0, errors };
}

/**
 * Computes Basic-mode cost breakdown for a single plan.
 * @param {Object} plan - The plan input values.
 * @param {Number} taxBracket - User's marginal tax bracket (0-100).
 * @param {String} premiumFrequency - 'monthly' (12×) or 'biweekly' (26×).
 * @returns {Object} breakdown with all computed fields.
 */
export function computeBasicPlanCost(plan, taxBracket, premiumFrequency) {
    const premiumPerPeriod = Number(plan.premium) || 0;
    const frequencyMap = {
        monthly:     { periods: 12, label: 'Monthly Premium' },
        semimonthly: { periods: 24, label: 'Semi-Monthly Premium' },
        biweekly:    { periods: 26, label: 'Bi-Weekly Premium' }
    };
    const freq = frequencyMap[premiumFrequency] || frequencyMap.monthly;
    const periodsPerYear = freq.periods;
    const premiumFrequencyLabel = freq.label;
    const oopm = Number(plan.oopm) || 0;
    const hsa = plan.isHDHP ? (Number(plan.hsa) || 0) : 0;
    const employerHsa = plan.isHDHP ? (Number(plan.employerHsa) || 0) : 0;
    const lpfsa = plan.isHDHP ? (Number(plan.lpfsa) || 0) : 0;
    const fsa = !plan.isHDHP ? (Number(plan.fsa) || 0) : 0;
    const taxRate = (Number(taxBracket) || 0) / 100;

    const annualPremium = premiumPerPeriod * periodsPerYear;

    // Tax savings apply ONLY to self-contributed pre-tax amounts
    const selfContributed = hsa + lpfsa + fsa;
    const taxSavings = selfContributed * taxRate;

    // Effective Annual Cost = worst-case (before any savings or offsets)
    const effectiveAnnualCost = annualPremium + oopm;

    // ---------------------------------------------------------------
    // Cost Offset Analysis
    // Show FULL values of each offset (not capped sequentially).
    // Net Annual Cost = max(0, effectiveAnnualCost − all offsets).
    // This gives a transparent view of every dollar working in
    // the user's favour.
    // ---------------------------------------------------------------

    const hsaApplied = hsa;                    // Full personal HSA contribution
    const employerHsaApplied = employerHsa;    // Full employer HSA contribution
    const lpfsaApplied = lpfsa;                // Full LP-FSA contribution
    const fsaApplied = fsa;                    // Full FSA contribution
    const taxSavingsApplied = taxSavings;      // Full tax savings

    const totalOffsets = hsaApplied + employerHsaApplied + lpfsaApplied + fsaApplied + taxSavingsApplied;
    const totalFundsAvailable = hsa + fsa + lpfsa + employerHsa;

    // Net cost after all deductions (can be negative = leftover funds)
    const netAnnualCost = effectiveAnnualCost - totalOffsets;

    return {
        planId: plan.id,
        planName: plan.name || 'Unnamed Plan',
        isHDHP: plan.isHDHP,
        premiumPerPeriod,
        periodsPerYear,
        premiumFrequencyLabel,
        annualPremium,
        oopm,
        hsa,
        employerHsa,
        lpfsa,
        fsa,
        selfContributed,
        taxRate: Number(taxBracket) || 0,
        taxSavings,
        effectiveAnnualCost,
        // Cost Offset Analysis
        totalFundsAvailable,
        totalOffsets,
        taxSavingsApplied,
        employerHsaApplied,
        hsaApplied,
        lpfsaApplied,
        fsaApplied,
        netAnnualCost
    };
}

/**
 * Compares multiple plans (Basic mode).
 * @param {Array} plans - Array of plan input objects.
 * @param {Number} taxBracket - User's marginal tax bracket (0-100).
 * @param {String} premiumFrequency - 'monthly' or 'biweekly'.
 * @returns {Object} { planResults: [...], cheapestPlanId, savingsVsNext }
 */
export function compareBasicPlans(plans, taxBracket, premiumFrequency) {
    if (!plans || plans.length === 0) {
        return { planResults: [], cheapestPlanId: null, savingsVsNext: 0 };
    }

    const planResults = plans.map(p =>
        computeBasicPlanCost(p, taxBracket, premiumFrequency || 'monthly')
    );

    // Sort a copy by net annual cost ascending (best value first)
    const sorted = [...planResults].sort(
        (a, b) => a.netAnnualCost - b.netAnnualCost
    );

    const cheapestPlanId = sorted[0].planId;

    // Savings compared to the next best plan
    const savingsVsNext =
        sorted.length > 1
            ? sorted[1].netAnnualCost - sorted[0].netAnnualCost
            : 0;

    // Mark each plan result with ranking info
    const rankedResults = planResults.map(r => ({
        ...r,
        isCheapest: r.planId === cheapestPlanId,
        rank: sorted.findIndex(s => s.planId === r.planId) + 1
    }));

    return {
        planResults: rankedResults,
        cheapestPlanId,
        cheapestPlanName: sorted[0].planName,
        savingsVsNext: Math.round(savingsVsNext * 100) / 100
    };
}

// ===================================================================
// ADVANCED MODE
// ===================================================================

/**
 * Validates a single plan's inputs for Advanced mode.
 */
export function validateAdvancedPlan(plan) {
    const errors = [];
    if (!plan.name || plan.name.trim() === '') {
        errors.push('Plan name is required.');
    }
    if (plan.premium === '' || plan.premium === null || plan.premium === undefined || Number(plan.premium) < 0) {
        errors.push('Premium must be zero or a positive number.');
    }
    if (plan.oopm === '' || plan.oopm === null || plan.oopm === undefined || Number(plan.oopm) < 0) {
        errors.push('Out-of-Pocket Max is required and must be zero or positive.');
    }
    return { valid: errors.length === 0, errors };
}

/**
 * Computes Advanced-mode cost breakdown for a single plan.
 *
 * @param {Object} plan - All plan fields from the advanced card.
 * @param {Number} taxBracket - User's marginal tax bracket (0-100).
 * @param {String} premiumFrequency - 'monthly', 'semimonthly', or 'biweekly'.
 * @returns {Object} Full breakdown.
 */
export function computeAdvancedPlanCost(plan, taxBracket, premiumFrequency) {
    // --- Premium ---
    const premiumPerPeriod = Number(plan.premium) || 0;
    const frequencyMap = {
        monthly:     { periods: 12, label: 'Monthly Premium' },
        semimonthly: { periods: 24, label: 'Semi-Monthly Premium' },
        biweekly:    { periods: 26, label: 'Bi-Weekly Premium' }
    };
    const freq = frequencyMap[premiumFrequency] || frequencyMap.monthly;
    const periodsPerYear = freq.periods;
    const premiumFrequencyLabel = freq.label;
    const annualPremium = premiumPerPeriod * periodsPerYear;

    // --- Deductible & OOPM ---
    const deductible = _toNum(plan.deductible);
    const oopmUsed   = _toNum(plan.oopm);
    const coinsuranceRate = _toNum(plan.coinsurance);

    // --- STEP 1: Medical Copays (flat fees, paid regardless of deductible) ---
    const _copayUsage = [
        { copay: _toNum(plan.pcpVisit),            visits: _toNum(plan.usagePcp) },
        { copay: _toNum(plan.specialistVisit),     visits: _toNum(plan.usageSpecialist) },
        { copay: _toNum(plan.urgentCare),          visits: _toNum(plan.usageUrgentCare) },
        { copay: _toNum(plan.emergencyRoom),       visits: _toNum(plan.usageER) },
        { copay: _toNum(plan.virtualPrimaryCare),  visits: _toNum(plan.usageVirtualPrimary) },
        { copay: _toNum(plan.virtualUrgentCare),   visits: _toNum(plan.usageVirtualUrgent) },
        { copay: _toNum(plan.preventiveCare),      visits: _toNum(plan.usagePreventive) },
        { copay: _toNum(plan.prenatalCare),        visits: _toNum(plan.usagePrenatal) },
        { copay: _toNum(plan.mentalHealthVisit),   visits: _toNum(plan.usageMentalHealth) },
        { copay: _toNum(plan.xrayLabWork),         visits: _toNum(plan.usageXrayLab) },
        { copay: _toNum(plan.inpatient),           visits: _toNum(plan.usageInpatient) }
    ];
    const totalMedicalCopays = _copayUsage.reduce(
        (sum, item) => sum + (item.copay * item.visits), 0
    );

    // --- STEP 2: Rx Deductible + Rx Copays ---
    // Rx deductible is paid first (full drug price until met).
    // THEN Rx copays apply per fill. So copay amounts entered are AFTER Rx deductible.
    // Both the Rx deductible and the Rx copays count toward OOP / OOPM.
    const rxDeductible = _toNum(plan.rxDeductible);
    const _rxUsage = [
        { cost: _toNum(plan.genericDrug),       fills: _toNum(plan.usageGenericRx) },
        { cost: _toNum(plan.preferredDrug),     fills: _toNum(plan.usagePreferredRx) },
        { cost: _toNum(plan.nonPreferredDrug),  fills: _toNum(plan.usageNonPreferredRx) },
        { cost: _toNum(plan.specialtyDrug),     fills: _toNum(plan.usageSpecialtyRx) }
    ];
    const totalRxCopays = _rxUsage.reduce(
        (sum, item) => sum + (item.cost * item.fills), 0
    );

    // --- STEP 3: Running OOP (all copays + Rx deductible count toward deductible & OOPM) ---
    // Copays are paid regardless but they DO count toward the deductible spend
    // and toward OOPM.
    const runningOOP = totalMedicalCopays + rxDeductible + totalRxCopays;

    // --- STEP 4: Deductible check ---
    // If your running OOP already exceeds the deductible, the deductible is met.
    // The "deductible applied" is the lesser of the deductible or runningOOP.
    const deductibleApplied = Math.min(deductible, runningOOP);

    // --- STEP 5: Coinsurance ---
    // After the deductible is met, coinsurance applies to costs BEYOND the deductible.
    // The basis for coinsurance = any OOP amount above the deductible.
    const amountBeyondDeductible = Math.max(0, runningOOP - deductible);
    const coinsuranceCost = amountBeyondDeductible * (coinsuranceRate / 100);

    // --- STEP 6: Total estimated OOP = all copays + Rx deductible + coinsurance ---
    const estimatedOOP = runningOOP + coinsuranceCost;

    // --- STEP 7: Cap at OOPM ---
    // Once OOPM is reached, insurance pays 100% for rest of year.
    const cappedOOP = Math.min(estimatedOOP, oopmUsed);
    const wasCappedAtOopm = estimatedOOP > oopmUsed;

    // --- Total Annual Cost = premium + capped OOP ---
    const totalAnnualCost = annualPremium + cappedOOP;

    // --- Tax-advantaged accounts & offsets (same logic as basic) ---
    const hsa = plan.isHDHP ? (_toNum(plan.hsa)) : 0;
    const employerHsa = plan.isHDHP ? (_toNum(plan.employerHsa)) : 0;
    const lpfsa = plan.isHDHP ? (_toNum(plan.lpfsa)) : 0;
    const fsa = !plan.isHDHP ? (_toNum(plan.fsa)) : 0;
    const taxRate = (_toNum(taxBracket)) / 100;

    const selfContributed = hsa + lpfsa + fsa;
    const taxSavings = selfContributed * taxRate;

    const hsaApplied = hsa;
    const employerHsaApplied = employerHsa;
    const lpfsaApplied = lpfsa;
    const fsaApplied = fsa;
    const taxSavingsApplied = taxSavings;
    const totalOffsets = hsaApplied + employerHsaApplied + lpfsaApplied + fsaApplied + taxSavingsApplied;

    const netAnnualCost = totalAnnualCost - totalOffsets;

    return {
        planId: plan.id,
        planName: plan.name || 'Unnamed Plan',
        isHDHP: plan.isHDHP,
        premiumPerPeriod,
        periodsPerYear,
        premiumFrequencyLabel,
        annualPremium,
        deductible,
        oopmUsed,
        coinsuranceRate,
        totalMedicalCopays,
        rxDeductible,
        totalRxCopays,
        runningOOP,
        deductibleApplied,
        amountBeyondDeductible,
        coinsuranceCost,
        estimatedOOP,
        cappedOOP,
        wasCappedAtOopm,
        totalAnnualCost,
        // Offsets
        hsa,
        employerHsa,
        lpfsa,
        fsa,
        selfContributed,
        taxRate: _toNum(taxBracket),
        taxSavings,
        hsaApplied,
        employerHsaApplied,
        lpfsaApplied,
        fsaApplied,
        taxSavingsApplied,
        totalOffsets,
        netAnnualCost
    };
}

// ---------------------------------------------------------------------------
// Private helpers
// ---------------------------------------------------------------------------

/** Safe number conversion: empty/null/undefined → 0 */
function _toNum(val) {
    if (val === '' || val === null || val === undefined) return 0;
    const n = Number(val);
    return Number.isNaN(n) ? 0 : n;
}

/** Returns true if the value was explicitly provided (not blank/null/undefined) */
function _hasValue(val) {
    return val !== '' && val !== null && val !== undefined && val !== 0 && val !== '0';
}

/**
 * Compares multiple plans (Advanced mode).
 */
export function compareAdvancedPlans(plans, taxBracket, premiumFrequency) {
    if (!plans || plans.length === 0) {
        return { planResults: [], cheapestPlanId: null, savingsVsNext: 0 };
    }

    const planResults = plans.map(p =>
        computeAdvancedPlanCost(p, taxBracket, premiumFrequency || 'monthly')
    );

    const sorted = [...planResults].sort(
        (a, b) => a.netAnnualCost - b.netAnnualCost
    );

    const cheapestPlanId = sorted[0].planId;
    const savingsVsNext =
        sorted.length > 1
            ? sorted[1].netAnnualCost - sorted[0].netAnnualCost
            : 0;

    const rankedResults = planResults.map(r => ({
        ...r,
        isCheapest: r.planId === cheapestPlanId,
        rank: sorted.findIndex(s => s.planId === r.planId) + 1
    }));

    return {
        planResults: rankedResults,
        cheapestPlanId,
        cheapestPlanName: sorted[0].planName,
        savingsVsNext: Math.round(savingsVsNext * 100) / 100
    };
}
