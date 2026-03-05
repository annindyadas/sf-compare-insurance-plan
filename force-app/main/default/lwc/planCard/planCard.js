import { LightningElement, api } from 'lwc';

export default class PlanCard extends LightningElement {
    @api planData;
    @api planIndex;
    @api canRemove = false;
    @api premiumLabel = 'Premium ($)';

    /* ---------- Getters ---------- */

    get planNumber() {
        return (this.planIndex || 0) + 1;
    }

    get planLabel() {
        return this.planData?.name
            ? this.planData.name
            : `Plan ${this.planNumber}`;
    }

    get cardTitle() {
        return `Plan ${this.planNumber}`;
    }

    get isHDHP() {
        return this.planData?.isHDHP || false;
    }

    get isNotHDHP() {
        return !this.isHDHP;
    }

    get hdhpGroupName() {
        return 'hdhp-' + this.planIndex;
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

    get premiumValue() {
        return this.planData?.premium ?? '';
    }

    get oopmValue() {
        return this.planData?.oopm ?? '';
    }

    get hsaValue() {
        return this.planData?.hsa ?? '';
    }

    get lpfsaValue() {
        return this.planData?.lpfsa ?? '';
    }

    get fsaValue() {
        return this.planData?.fsa ?? '';
    }

    get employerHsaValue() {
        return this.planData?.employerHsa ?? '';
    }

    get planNameValue() {
        return this.planData?.name ?? '';
    }

    get removeButtonTitle() {
        return `Remove ${this.planLabel}`;
    }

    /* ---------- Event Handlers ---------- */

    handleFieldChange(event) {
        const field = event.target.dataset.field;
        let value;

        if (field === 'isHDHP') {
            value = event.detail.value === 'yes';
        } else if (field === 'name') {
            value = event.detail.value;
        } else {
            value = event.detail.value;
        }

        // Build updated plan data
        const updatedPlan = { ...this.planData, [field]: value };

        // When switching HDHP toggle, clear the opposing accounts
        if (field === 'isHDHP') {
            if (value) {
                // Switched TO HDHP — clear FSA
                updatedPlan.fsa = '';
            } else {
                // Switched FROM HDHP — clear HSA, Employer HSA, and LP-FSA
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
