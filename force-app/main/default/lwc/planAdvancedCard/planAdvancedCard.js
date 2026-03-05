import { LightningElement, api } from 'lwc';

export default class PlanAdvancedCard extends LightningElement {
    @api planData;
    @api planIndex;
    @api canRemove = false;
    @api premiumLabel = 'Premium ($)';

    // Collapsible section state
    showCostSharing = true;
    showAccounts = false;
    showMedical = false;
    showPrescription = false;

    /* ---------- Getters ---------- */

    get planNumber() {
        return (this.planIndex || 0) + 1;
    }

    get planLabel() {
        return this.planData?.name ? this.planData.name : `Plan ${this.planNumber}`;
    }

    get isHDHP() {
        return this.planData?.isHDHP || false;
    }

    get isNotHDHP() {
        return !this.isHDHP;
    }

    get hdhpGroupName() {
        return 'hdhp-adv-' + this.planIndex;
    }

    get hdhpOptions() {
        return [
            { label: 'Yes', value: 'yes' },
            { label: 'No', value: 'no' }
        ];
    }

    get hdhpValue() {
        return this.isHDHP ? 'yes' : 'no';
    }

    get removeButtonTitle() {
        return `Remove ${this.planLabel}`;
    }

    // Section toggle icons
    get costSharingIcon() {
        return this.showCostSharing ? 'utility:chevrondown' : 'utility:chevronright';
    }
    get accountsIcon() {
        return this.showAccounts ? 'utility:chevrondown' : 'utility:chevronright';
    }
    get medicalIcon() {
        return this.showMedical ? 'utility:chevrondown' : 'utility:chevronright';
    }
    get prescriptionIcon() {
        return this.showPrescription ? 'utility:chevrondown' : 'utility:chevronright';
    }

    // Value getters
    get planNameValue() { return this.planData?.name ?? ''; }
    get premiumValue() { return this.planData?.premium ?? ''; }
    get deductibleValue() { return this.planData?.deductible ?? ''; }
    get oopmValue() { return this.planData?.oopm ?? ''; }
    get coinsuranceValue() { return this.planData?.coinsurance ?? ''; }
    get hsaValue() { return this.planData?.hsa ?? ''; }
    get employerHsaValue() { return this.planData?.employerHsa ?? ''; }
    get lpfsaValue() { return this.planData?.lpfsa ?? ''; }
    get fsaValue() { return this.planData?.fsa ?? ''; }
    get pcpVisitValue() { return this.planData?.pcpVisit ?? ''; }
    get specialistVisitValue() { return this.planData?.specialistVisit ?? ''; }
    get urgentCareValue() { return this.planData?.urgentCare ?? ''; }
    get emergencyRoomValue() { return this.planData?.emergencyRoom ?? ''; }
    get virtualPrimaryCareValue() { return this.planData?.virtualPrimaryCare ?? ''; }
    get virtualUrgentCareValue() { return this.planData?.virtualUrgentCare ?? ''; }
    get preventiveCareValue() { return this.planData?.preventiveCare ?? ''; }
    get prenatalCareValue() { return this.planData?.prenatalCare ?? ''; }
    get mentalHealthVisitValue() { return this.planData?.mentalHealthVisit ?? ''; }
    get xrayLabWorkValue() { return this.planData?.xrayLabWork ?? ''; }
    get inpatientValue() { return this.planData?.inpatient ?? ''; }
    get rxDeductibleValue() { return this.planData?.rxDeductible ?? ''; }
    get genericDrugValue() { return this.planData?.genericDrug ?? ''; }
    get preferredDrugValue() { return this.planData?.preferredDrug ?? ''; }
    get nonPreferredDrugValue() { return this.planData?.nonPreferredDrug ?? ''; }
    get specialtyDrugValue() { return this.planData?.specialtyDrug ?? ''; }

    /* ---------- Section Toggles ---------- */

    toggleCostSharing() { this.showCostSharing = !this.showCostSharing; }
    toggleAccounts() { this.showAccounts = !this.showAccounts; }
    toggleMedical() { this.showMedical = !this.showMedical; }
    togglePrescription() { this.showPrescription = !this.showPrescription; }

    /* ---------- Event Handlers ---------- */

    handleFieldChange(event) {
        const field = event.target.dataset.field;
        let value;

        if (field === 'isHDHP') {
            value = event.detail.value === 'yes';
        } else {
            value = event.detail.value;
        }

        const updatedPlan = { ...this.planData, [field]: value };

        // When switching HDHP toggle, clear opposing accounts
        if (field === 'isHDHP') {
            if (value) {
                updatedPlan.fsa = '';
            } else {
                updatedPlan.hsa = '';
                updatedPlan.employerHsa = '';
                updatedPlan.lpfsa = '';
            }
        }

        this.dispatchEvent(
            new CustomEvent('planchange', {
                detail: { plan: updatedPlan },
                bubbles: false,
                composed: false
            })
        );
    }

    handleRemove() {
        this.dispatchEvent(
            new CustomEvent('removeplan', {
                detail: { planId: this.planData.id },
                bubbles: false,
                composed: false
            })
        );
    }

    /* ---------- Public Validation ---------- */

    @api
    validate() {
        const inputs = this.template.querySelectorAll(
            'lightning-input, lightning-radio-group'
        );
        let allValid = true;
        inputs.forEach(input => {
            if (typeof input.reportValidity === 'function') {
                if (!input.reportValidity()) {
                    allValid = false;
                }
            }
        });
        return allValid;
    }
}
