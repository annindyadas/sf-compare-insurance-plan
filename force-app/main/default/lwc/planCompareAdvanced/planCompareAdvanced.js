import { LightningElement, api } from 'lwc';
import { compareAdvancedPlans, validateAdvancedPlan } from 'c/planCalcEngine';
import saveComparison from '@salesforce/apex/PlanComparisonController.saveComparison';
import updateComparison from '@salesforce/apex/PlanComparisonController.updateComparison';

export default class PlanCompareAdvanced extends LightningElement {

    // -------------------------------------------------------
    // State
    // -------------------------------------------------------
    plans = [];
    taxBracket = '';
    premiumFrequency = 'monthly';
    showResults = false;
    results = null;
    validationErrors = [];
    showUsagePanel = true;

    // Save state
    isSaving = false;
    showSaveModal = false;
    savedComparisonId = '';
    copyToastVisible = false;

    // Shared usage data — applies to all plans
    usage = {
        usagePcp: '',
        usageSpecialist: '',
        usageUrgentCare: '',
        usageER: '',
        usageVirtualPrimary: '',
        usageVirtualUrgent: '',
        usagePreventive: '',
        usagePrenatal: '',
        usageMentalHealth: '',
        usageXrayLab: '',
        usageInpatient: '',
        usageGenericRx: '',
        usagePreferredRx: '',
        usageNonPreferredRx: '',
        usageSpecialtyRx: ''
    };

    // Horizontal scroll state
    _hasScrollOverflow = false;

    premiumFrequencyOptions = [
        { label: 'Monthly (12×)', value: 'monthly' },
        { label: 'Semi-Monthly (24×)', value: 'semimonthly' },
        { label: 'Bi-Weekly (26×)', value: 'biweekly' }
    ];

    // -------------------------------------------------------
    // Lifecycle
    // -------------------------------------------------------
    connectedCallback() {
        this.plans = [this._createBlankPlan()];
    }

    renderedCallback() {
        this._checkScrollOverflow();
    }

    // -------------------------------------------------------
    // Getters
    // -------------------------------------------------------
    get isUpdate() {
        return this.savedComparisonId !== '';
    }

    get saveButtonLabel() {
        return 'Save';
    }

    get saveModalTitle() {
        return this.isUpdate ? 'Comparison Updated!' : 'Comparison Saved!';
    }

    get canAddPlan() {
        return this.plans.length < 5;
    }

    get cannotCompare() {
        return this.plans.length < 2;
    }

    get addPlanTooltip() {
        return this.canAddPlan
            ? 'Add another plan to compare (max 5)'
            : 'Maximum of 5 plans reached';
    }

    get planCount() {
        return this.plans.length;
    }

    get plansWithMeta() {
        return this.plans.map((plan, index) => ({
            ...plan,
            index,
            canRemove: this.plans.length > 1,
            key: plan.id
        }));
    }

    get hasValidationErrors() {
        return this.validationErrors.length > 0;
    }

    get compareButtonLabel() {
        return this.showResults ? 'Recalculate' : 'Compare Plans';
    }

    get premiumLabel() {
        return 'Premium ($)';
    }

    get usagePanelChevron() {
        return this.showUsagePanel ? 'utility:chevrondown' : 'utility:chevronright';
    }

    get scrollContainerClass() {
        return this._hasScrollOverflow
            ? 'plans-scroll-container has-overflow'
            : 'plans-scroll-container';
    }

    get showScrollHint() {
        return this.plans.length > 2;
    }

    // -------------------------------------------------------
    // Event Handlers
    // -------------------------------------------------------
    handleCardsScroll() {
        this._checkScrollOverflow();
    }

    handleAddPlan() {
        if (!this.canAddPlan) return;
        this.plans = [...this.plans, this._createBlankPlan()];
        this.showResults = false;

        // Scroll the new card into view after render
        // eslint-disable-next-line @lwc/lwc/no-async-operation
        setTimeout(() => {
            const scrollEl = this.template.querySelector('.plans-scroll');
            if (scrollEl) {
                scrollEl.scrollTo({ left: scrollEl.scrollWidth, behavior: 'smooth' });
            }
        }, 50);
    }

    handleRemovePlan(event) {
        const planId = event.detail.planId;
        this.plans = this.plans.filter(p => p.id !== planId);
        this.showResults = false;
    }

    handlePlanChange(event) {
        const updatedPlan = event.detail.plan;
        this.plans = this.plans.map(p =>
            p.id === updatedPlan.id ? updatedPlan : p
        );
        this.showResults = false;
    }

    handleTaxBracketChange(event) {
        this.taxBracket = event.detail.value;
        this.showResults = false;
    }

    handleFrequencyChange(event) {
        this.premiumFrequency = event.detail.value;
        this.showResults = false;
    }

    toggleUsagePanel() {
        this.showUsagePanel = !this.showUsagePanel;
    }

    handleUsageChange(event) {
        const field = event.target.dataset.usage;
        this.usage = { ...this.usage, [field]: event.detail.value };
        this.showResults = false;
    }

    // -------------------------------------------------------
    // Compare
    // -------------------------------------------------------
    handleCompare() {
        // 1) Validate all plan cards
        const planCards = this.template.querySelectorAll('c-plan-advanced-card');
        let allCardsValid = true;
        planCards.forEach(card => {
            if (!card.validate()) {
                allCardsValid = false;
            }
        });

        // 2) Validate global settings
        const settingsInputs = this.template.querySelectorAll('.settings-bar lightning-input');
        settingsInputs.forEach(input => {
            if (typeof input.reportValidity === 'function') {
                if (!input.reportValidity()) {
                    allCardsValid = false;
                }
            }
        });

        // 3) Validate plan data
        const errors = [];
        if (this.taxBracket !== '' && this.taxBracket !== null && this.taxBracket !== undefined) {
            if (Number(this.taxBracket) < 0 || Number(this.taxBracket) > 100) {
                errors.push('Tax bracket must be between 0 and 100.');
            }
        }
        if (this.plans.length < 2) {
            errors.push('Please add at least 2 plans to compare.');
        }
        this.plans.forEach((plan, i) => {
            const validation = validateAdvancedPlan(plan);
            if (!validation.valid) {
                validation.errors.forEach(err => {
                    errors.push(`Plan ${i + 1}: ${err}`);
                });
            }
        });

        this.validationErrors = errors;
        if (!allCardsValid || errors.length > 0) {
            return;
        }

        // 4) Merge shared usage into each plan, then calculate
        const plansWithUsage = this.plans.map(p => ({ ...p, ...this.usage }));
        this.results = compareAdvancedPlans(
            plansWithUsage,
            Number(this.taxBracket),
            this.premiumFrequency
        );
        this.showResults = true;

        // eslint-disable-next-line @lwc/lwc/no-async-operation
        setTimeout(() => {
            const resultsEl = this.template.querySelector('c-plan-advanced-results');
            if (resultsEl) {
                resultsEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        }, 100);
    }

    handleReset() {
        this.plans = [this._createBlankPlan()];
        this.taxBracket = '';
        this.premiumFrequency = 'monthly';
        this.showResults = false;
        this.results = null;
        this.validationErrors = [];
        this.showUsagePanel = true;
        this.usage = {
            usagePcp: '',
            usageSpecialist: '',
            usageUrgentCare: '',
            usageER: '',
            usageVirtualPrimary: '',
            usageVirtualUrgent: '',
            usagePreventive: '',
            usagePrenatal: '',
            usageMentalHealth: '',
            usageXrayLab: '',
            usageInpatient: '',
            usageGenericRx: '',
            usagePreferredRx: '',
            usageNonPreferredRx: '',
            usageSpecialtyRx: ''
        };
    }

    // -------------------------------------------------------
    // Save
    // -------------------------------------------------------
    async handleSave() {
        if (this.plans.length < 1) return;

        this.isSaving = true;
        try {
            const payload = {
                mode: 'Advanced',
                premiumFrequency: this.premiumFrequency,
                taxBracket: this.taxBracket,
                // Shared usage
                usagePcp: this.usage.usagePcp,
                usageSpecialist: this.usage.usageSpecialist,
                usageUrgentCare: this.usage.usageUrgentCare,
                usageER: this.usage.usageER,
                usageVirtualPrimary: this.usage.usageVirtualPrimary,
                usageVirtualUrgent: this.usage.usageVirtualUrgent,
                usagePreventive: this.usage.usagePreventive,
                usagePrenatal: this.usage.usagePrenatal,
                usageMentalHealth: this.usage.usageMentalHealth,
                usageXrayLab: this.usage.usageXrayLab,
                usageInpatient: this.usage.usageInpatient,
                usageGenericRx: this.usage.usageGenericRx,
                usagePreferredRx: this.usage.usagePreferredRx,
                usageNonPreferredRx: this.usage.usageNonPreferredRx,
                usageSpecialtyRx: this.usage.usageSpecialtyRx,
                plans: this.plans
            };

            if (this.savedComparisonId) {
                // Update existing comparison
                await updateComparison({
                    comparisonId: this.savedComparisonId,
                    payload: JSON.stringify(payload)
                });
            } else {
                // Create new comparison
                const comparisonId = await saveComparison({ payload: JSON.stringify(payload) });
                this.savedComparisonId = comparisonId;
            }
            this.showSaveModal = true;
        } catch (error) {
            const msg = error?.body?.message || error?.message || 'Save failed.';
            this.validationErrors = [msg];
        } finally {
            this.isSaving = false;
        }
    }

    handleCloseSaveModal() {
        this.showSaveModal = false;
    }

    handleCopyId() {
        const text = this.savedComparisonId;
        const el = document.createElement('textarea');
        el.value = text;
        el.setAttribute('readonly', '');
        el.style.position = 'absolute';
        el.style.left = '-9999px';
        document.body.appendChild(el);
        el.select();
        // eslint-disable-next-line no-restricted-properties
        document.execCommand('copy');
        document.body.removeChild(el);

        // Show brief "Copied!" toast
        this.copyToastVisible = true;
        // eslint-disable-next-line @lwc/lwc/no-async-operation
        setTimeout(() => { this.copyToastVisible = false; }, 2000);
    }

    // -------------------------------------------------------
    // Load Saved Data (called by parent)
    // -------------------------------------------------------
    @api
    loadSavedData(data) {
        this.savedComparisonId = data.comparisonId || '';
        // Settings
        this.taxBracket = data.taxBracket != null ? String(data.taxBracket) : '';
        this.premiumFrequency = data.premiumFrequency || 'monthly';

        // Usage
        const u = data.usage || {};
        this.usage = {
            usagePcp: this._valOrEmpty(u.usagePcp),
            usageSpecialist: this._valOrEmpty(u.usageSpecialist),
            usageUrgentCare: this._valOrEmpty(u.usageUrgentCare),
            usageER: this._valOrEmpty(u.usageER),
            usageVirtualPrimary: this._valOrEmpty(u.usageVirtualPrimary),
            usageVirtualUrgent: this._valOrEmpty(u.usageVirtualUrgent),
            usagePreventive: this._valOrEmpty(u.usagePreventive),
            usagePrenatal: this._valOrEmpty(u.usagePrenatal),
            usageMentalHealth: this._valOrEmpty(u.usageMentalHealth),
            usageXrayLab: this._valOrEmpty(u.usageXrayLab),
            usageInpatient: this._valOrEmpty(u.usageInpatient),
            usageGenericRx: this._valOrEmpty(u.usageGenericRx),
            usagePreferredRx: this._valOrEmpty(u.usagePreferredRx),
            usageNonPreferredRx: this._valOrEmpty(u.usageNonPreferredRx),
            usageSpecialtyRx: this._valOrEmpty(u.usageSpecialtyRx)
        };
        this.showUsagePanel = true;

        // Plans
        const loadedPlans = data.plans || [];
        this._planIdCounter = 0;
        this.plans = loadedPlans.map(p => {
            this._planIdCounter += 1;
            return {
                id: this._planIdCounter,
                name: p.name || '',
                isHDHP: p.isHDHP === true,
                premium: this._valOrEmpty(p.premium),
                deductible: this._valOrEmpty(p.deductible),
                oopm: this._valOrEmpty(p.oopm),
                coinsurance: this._valOrEmpty(p.coinsurance),
                hsa: this._valOrEmpty(p.hsa),
                employerHsa: this._valOrEmpty(p.employerHsa),
                fsa: this._valOrEmpty(p.fsa),
                lpfsa: this._valOrEmpty(p.lpfsa),
                pcpVisit: this._valOrEmpty(p.pcpVisit),
                specialistVisit: this._valOrEmpty(p.specialistVisit),
                urgentCare: this._valOrEmpty(p.urgentCare),
                emergencyRoom: this._valOrEmpty(p.emergencyRoom),
                virtualPrimaryCare: this._valOrEmpty(p.virtualPrimaryCare),
                virtualUrgentCare: this._valOrEmpty(p.virtualUrgentCare),
                preventiveCare: this._valOrEmpty(p.preventiveCare),
                prenatalCare: this._valOrEmpty(p.prenatalCare),
                mentalHealthVisit: this._valOrEmpty(p.mentalHealthVisit),
                xrayLabWork: this._valOrEmpty(p.xrayLabWork),
                inpatient: this._valOrEmpty(p.inpatient),
                rxDeductible: this._valOrEmpty(p.rxDeductible),
                genericDrug: this._valOrEmpty(p.genericDrug),
                preferredDrug: this._valOrEmpty(p.preferredDrug),
                nonPreferredDrug: this._valOrEmpty(p.nonPreferredDrug),
                specialtyDrug: this._valOrEmpty(p.specialtyDrug)
            };
        });

        if (this.plans.length === 0) {
            this.plans = [this._createBlankPlan()];
        }

        this.showResults = false;
        this.results = null;
        this.validationErrors = [];
    }

    // -------------------------------------------------------
    // Private Helpers
    // -------------------------------------------------------
    _planIdCounter = 0;

    _checkScrollOverflow() {
        const scrollEl = this.template.querySelector('.plans-scroll');
        if (scrollEl) {
            const hasOverflow = scrollEl.scrollWidth > scrollEl.clientWidth;
            // Check if scroll is near the right edge — hide gradient if so
            const nearEnd = (scrollEl.scrollLeft + scrollEl.clientWidth) >= (scrollEl.scrollWidth - 10);
            this._hasScrollOverflow = hasOverflow && !nearEnd;
        }
    }

    _valOrEmpty(val) {
        return val != null ? String(val) : '';
    }

    _createBlankPlan() {
        this._planIdCounter += 1;
        return {
            id: this._planIdCounter,
            name: '',
            isHDHP: false,
            premium: '',
            // Deductibles & OOPM
            deductible: '',
            oopm: '',
            coinsurance: '',
            // Tax-advantaged accounts
            hsa: '',
            employerHsa: '',
            fsa: '',
            lpfsa: '',
            // Medical service copays
            pcpVisit: '',
            specialistVisit: '',
            urgentCare: '',
            emergencyRoom: '',
            virtualPrimaryCare: '',
            virtualUrgentCare: '',
            preventiveCare: '',
            prenatalCare: '',
            mentalHealthVisit: '',
            xrayLabWork: '',
            inpatient: '',
            // Prescription costs
            rxDeductible: '',
            genericDrug: '',
            preferredDrug: '',
            nonPreferredDrug: '',
            specialtyDrug: ''
        };
    }
}
