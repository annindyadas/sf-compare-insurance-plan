import { LightningElement } from 'lwc';
import getComparison from '@salesforce/apex/PlanComparisonController.getComparison';

export default class PlanCompareApp extends LightningElement {

    modeOptions = [
        { label: 'Basic', value: 'basic' },
        { label: 'Advanced', value: 'advanced' }
    ];
    selectedMode = 'basic';

    // Retrieve state
    retrieveId = '';
    isRetrieving = false;
    retrieveError = '';
    _loadedData = null;

    get isBasicMode() {
        return this.selectedMode === 'basic';
    }

    get isAdvancedMode() {
        return this.selectedMode === 'advanced';
    }

    get modeDescription() {
        return this.isBasicMode
            ? 'Quick worst-case comparison using premiums and out-of-pocket maximums.'
            : 'Detailed comparison using copays, deductibles, coinsurance, prescriptions, and your expected usage.';
    }

    get currentYear() {
        return new Date().getFullYear();
    }

    get hasRetrieveError() {
        return this.retrieveError !== '';
    }

    handleModeChange(event) {
        this.selectedMode = event.detail.value;
        this._loadedData = null;
    }

    handleRetrieveIdChange(event) {
        this.retrieveId = event.detail.value;
        this.retrieveError = '';
    }

    async handleRetrieve() {
        const id = this.retrieveId ? this.retrieveId.trim() : '';
        if (!id) {
            this.retrieveError = 'Please enter a Comparison ID.';
            return;
        }

        this.isRetrieving = true;
        this.retrieveError = '';
        this._loadedData = null;

        try {
            const result = await getComparison({ comparisonId: id });
            // Switch to the correct mode
            const mode = (result.mode || 'Basic').toLowerCase();
            this.selectedMode = mode === 'advanced' ? 'advanced' : 'basic';
            this._loadedData = result;

            // After render, push loaded data to the child
            // eslint-disable-next-line @lwc/lwc/no-async-operation
            setTimeout(() => {
                this._pushLoadedDataToChild();
            }, 100);
        } catch (error) {
            const msg = error?.body?.message || error?.message || 'Failed to retrieve comparison.';
            this.retrieveError = msg;
        } finally {
            this.isRetrieving = false;
        }
    }

    _pushLoadedDataToChild() {
        if (!this._loadedData) return;
        const child = this.selectedMode === 'basic'
            ? this.template.querySelector('c-plan-compare-basic')
            : this.template.querySelector('c-plan-compare-advanced');
        if (child && typeof child.loadSavedData === 'function') {
            child.loadSavedData(this._loadedData);
        }
        this._loadedData = null;
    }
}
