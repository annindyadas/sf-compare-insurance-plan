/**
 * PlanComparisonController
 * Apex controller for saving and retrieving plan comparison sessions.
 * Uses "without sharing" so guest users on the LWR Experience Site can
 * create and retrieve records without needing object-level permissions.
 */
public without sharing class PlanComparisonController {

    // -------------------------------------------------------
    // Save a comparison
    // -------------------------------------------------------
    @AuraEnabled
    public static String saveComparison(String payload) {
        try {
            Map<String, Object> data = (Map<String, Object>) JSON.deserializeUntyped(payload);

            // --- Build parent record ---
            Plan_Comparison__c comp = new Plan_Comparison__c();
            comp.Comparison_Id__c          = generateUniqueId();
            comp.Mode__c                   = (String) data.get('mode');
            comp.Premium_Frequency__c      = (String) data.get('premiumFrequency');
            comp.Tax_Bracket__c            = toDecimal(data.get('taxBracket'));

            // Shared usage (Advanced mode only)
            comp.Usage_PCP__c              = toDecimal(data.get('usagePcp'));
            comp.Usage_Specialist__c       = toDecimal(data.get('usageSpecialist'));
            comp.Usage_Urgent_Care__c      = toDecimal(data.get('usageUrgentCare'));
            comp.Usage_ER__c               = toDecimal(data.get('usageER'));
            comp.Usage_Virtual_Primary__c  = toDecimal(data.get('usageVirtualPrimary'));
            comp.Usage_Virtual_Urgent__c   = toDecimal(data.get('usageVirtualUrgent'));
            comp.Usage_Preventive__c       = toDecimal(data.get('usagePreventive'));
            comp.Usage_Prenatal__c         = toDecimal(data.get('usagePrenatal'));
            comp.Usage_Mental_Health__c    = toDecimal(data.get('usageMentalHealth'));
            comp.Usage_Xray_Lab__c         = toDecimal(data.get('usageXrayLab'));
            comp.Usage_Inpatient__c        = toDecimal(data.get('usageInpatient'));
            comp.Usage_Generic_Rx__c       = toDecimal(data.get('usageGenericRx'));
            comp.Usage_Preferred_Rx__c     = toDecimal(data.get('usagePreferredRx'));
            comp.Usage_Non_Preferred_Rx__c = toDecimal(data.get('usageNonPreferredRx'));
            comp.Usage_Specialty_Rx__c     = toDecimal(data.get('usageSpecialtyRx'));

            insert comp;

            // --- Build child plan records ---
            List<Object> plansList = (List<Object>) data.get('plans');
            List<Plan_Detail__c> details = new List<Plan_Detail__c>();

            for (Integer i = 0; i < plansList.size(); i++) {
                Map<String, Object> p = (Map<String, Object>) plansList[i];
                Plan_Detail__c d = new Plan_Detail__c();
                d.Plan_Comparison__c      = comp.Id;
                d.Name                    = (String) p.get('name');
                d.Plan_Order__c           = i + 1;
                d.Is_HDHP__c              = Boolean.valueOf(p.get('isHDHP'));
                d.Premium__c              = toDecimal(p.get('premium'));
                d.OOPM__c                 = toDecimal(p.get('oopm'));
                d.Deductible__c           = toDecimal(p.get('deductible'));
                d.Coinsurance__c          = toDecimal(p.get('coinsurance'));
                // Tax-advantaged accounts
                d.HSA__c                  = toDecimal(p.get('hsa'));
                d.Employer_HSA__c         = toDecimal(p.get('employerHsa'));
                d.FSA__c                  = toDecimal(p.get('fsa'));
                d.LPFSA__c                = toDecimal(p.get('lpfsa'));
                // Medical copays
                d.Copay_PCP__c            = toDecimal(p.get('pcpVisit'));
                d.Copay_Specialist__c     = toDecimal(p.get('specialistVisit'));
                d.Copay_Urgent_Care__c    = toDecimal(p.get('urgentCare'));
                d.Copay_ER__c             = toDecimal(p.get('emergencyRoom'));
                d.Copay_Virtual_Primary__c = toDecimal(p.get('virtualPrimaryCare'));
                d.Copay_Virtual_Urgent__c = toDecimal(p.get('virtualUrgentCare'));
                d.Copay_Preventive__c     = toDecimal(p.get('preventiveCare'));
                d.Copay_Prenatal__c       = toDecimal(p.get('prenatalCare'));
                d.Copay_Mental_Health__c  = toDecimal(p.get('mentalHealthVisit'));
                d.Copay_Xray_Lab__c       = toDecimal(p.get('xrayLabWork'));
                d.Copay_Inpatient__c      = toDecimal(p.get('inpatient'));
                // Prescription
                d.Rx_Deductible__c        = toDecimal(p.get('rxDeductible'));
                d.Rx_Generic__c           = toDecimal(p.get('genericDrug'));
                d.Rx_Preferred__c         = toDecimal(p.get('preferredDrug'));
                d.Rx_Non_Preferred__c     = toDecimal(p.get('nonPreferredDrug'));
                d.Rx_Specialty__c         = toDecimal(p.get('specialtyDrug'));

                details.add(d);
            }

            insert details;

            return comp.Comparison_Id__c;

        } catch (Exception e) {
            throw new AuraHandledException('Save failed: ' + e.getMessage());
        }
    }

    // -------------------------------------------------------
    // Update an existing comparison
    // -------------------------------------------------------
    @AuraEnabled
    public static void updateComparison(String comparisonId, String payload) {
        try {
            Map<String, Object> data = (Map<String, Object>) JSON.deserializeUntyped(payload);

            // Find existing parent record
            String cleanId = String.escapeSingleQuotes(comparisonId.trim().toUpperCase());
            List<Plan_Comparison__c> existing = [
                SELECT Id FROM Plan_Comparison__c WHERE Comparison_Id__c = :cleanId LIMIT 1
            ];
            if (existing.isEmpty()) {
                throw new AuraHandledException('No comparison found with ID: ' + comparisonId);
            }

            Plan_Comparison__c comp = existing[0];

            // Update parent fields
            comp.Mode__c                   = (String) data.get('mode');
            comp.Premium_Frequency__c      = (String) data.get('premiumFrequency');
            comp.Tax_Bracket__c            = toDecimal(data.get('taxBracket'));
            comp.Usage_PCP__c              = toDecimal(data.get('usagePcp'));
            comp.Usage_Specialist__c       = toDecimal(data.get('usageSpecialist'));
            comp.Usage_Urgent_Care__c      = toDecimal(data.get('usageUrgentCare'));
            comp.Usage_ER__c               = toDecimal(data.get('usageER'));
            comp.Usage_Virtual_Primary__c  = toDecimal(data.get('usageVirtualPrimary'));
            comp.Usage_Virtual_Urgent__c   = toDecimal(data.get('usageVirtualUrgent'));
            comp.Usage_Preventive__c       = toDecimal(data.get('usagePreventive'));
            comp.Usage_Prenatal__c         = toDecimal(data.get('usagePrenatal'));
            comp.Usage_Mental_Health__c    = toDecimal(data.get('usageMentalHealth'));
            comp.Usage_Xray_Lab__c         = toDecimal(data.get('usageXrayLab'));
            comp.Usage_Inpatient__c        = toDecimal(data.get('usageInpatient'));
            comp.Usage_Generic_Rx__c       = toDecimal(data.get('usageGenericRx'));
            comp.Usage_Preferred_Rx__c     = toDecimal(data.get('usagePreferredRx'));
            comp.Usage_Non_Preferred_Rx__c = toDecimal(data.get('usageNonPreferredRx'));
            comp.Usage_Specialty_Rx__c     = toDecimal(data.get('usageSpecialtyRx'));

            update comp;

            // Delete old child records, then insert fresh ones
            List<Plan_Detail__c> oldDetails = [
                SELECT Id FROM Plan_Detail__c WHERE Plan_Comparison__c = :comp.Id
            ];
            if (!oldDetails.isEmpty()) {
                delete oldDetails;
            }

            List<Object> plansList = (List<Object>) data.get('plans');
            List<Plan_Detail__c> details = new List<Plan_Detail__c>();

            for (Integer i = 0; i < plansList.size(); i++) {
                Map<String, Object> p = (Map<String, Object>) plansList[i];
                Plan_Detail__c d = new Plan_Detail__c();
                d.Plan_Comparison__c      = comp.Id;
                d.Name                    = (String) p.get('name');
                d.Plan_Order__c           = i + 1;
                d.Is_HDHP__c              = Boolean.valueOf(p.get('isHDHP'));
                d.Premium__c              = toDecimal(p.get('premium'));
                d.OOPM__c                 = toDecimal(p.get('oopm'));
                d.Deductible__c           = toDecimal(p.get('deductible'));
                d.Coinsurance__c          = toDecimal(p.get('coinsurance'));
                d.HSA__c                  = toDecimal(p.get('hsa'));
                d.Employer_HSA__c         = toDecimal(p.get('employerHsa'));
                d.FSA__c                  = toDecimal(p.get('fsa'));
                d.LPFSA__c                = toDecimal(p.get('lpfsa'));
                d.Copay_PCP__c            = toDecimal(p.get('pcpVisit'));
                d.Copay_Specialist__c     = toDecimal(p.get('specialistVisit'));
                d.Copay_Urgent_Care__c    = toDecimal(p.get('urgentCare'));
                d.Copay_ER__c             = toDecimal(p.get('emergencyRoom'));
                d.Copay_Virtual_Primary__c = toDecimal(p.get('virtualPrimaryCare'));
                d.Copay_Virtual_Urgent__c = toDecimal(p.get('virtualUrgentCare'));
                d.Copay_Preventive__c     = toDecimal(p.get('preventiveCare'));
                d.Copay_Prenatal__c       = toDecimal(p.get('prenatalCare'));
                d.Copay_Mental_Health__c  = toDecimal(p.get('mentalHealthVisit'));
                d.Copay_Xray_Lab__c       = toDecimal(p.get('xrayLabWork'));
                d.Copay_Inpatient__c      = toDecimal(p.get('inpatient'));
                d.Rx_Deductible__c        = toDecimal(p.get('rxDeductible'));
                d.Rx_Generic__c           = toDecimal(p.get('genericDrug'));
                d.Rx_Preferred__c         = toDecimal(p.get('preferredDrug'));
                d.Rx_Non_Preferred__c     = toDecimal(p.get('nonPreferredDrug'));
                d.Rx_Specialty__c         = toDecimal(p.get('specialtyDrug'));

                details.add(d);
            }

            insert details;

        } catch (AuraHandledException ae) {
            throw ae;
        } catch (Exception e) {
            throw new AuraHandledException('Update failed: ' + e.getMessage());
        }
    }

    // -------------------------------------------------------
    // Retrieve a comparison by unique ID
    // -------------------------------------------------------
    @AuraEnabled
    public static Map<String, Object> getComparison(String comparisonId) {
        try {
            String cleanId = String.escapeSingleQuotes(comparisonId.trim().toUpperCase());

            List<Plan_Comparison__c> comps = [
                SELECT Id, Comparison_Id__c, Mode__c, Tax_Bracket__c, Premium_Frequency__c,
                       Usage_PCP__c, Usage_Specialist__c, Usage_Urgent_Care__c,
                       Usage_ER__c, Usage_Virtual_Primary__c, Usage_Virtual_Urgent__c,
                       Usage_Preventive__c, Usage_Prenatal__c, Usage_Mental_Health__c,
                       Usage_Xray_Lab__c, Usage_Inpatient__c,
                       Usage_Generic_Rx__c, Usage_Preferred_Rx__c,
                       Usage_Non_Preferred_Rx__c, Usage_Specialty_Rx__c,
                       (SELECT Id, Name, Plan_Order__c, Is_HDHP__c, Premium__c,
                               OOPM__c, Deductible__c, Coinsurance__c,
                               HSA__c, Employer_HSA__c, FSA__c, LPFSA__c,
                               Copay_PCP__c, Copay_Specialist__c, Copay_Urgent_Care__c,
                               Copay_ER__c, Copay_Virtual_Primary__c, Copay_Virtual_Urgent__c,
                               Copay_Preventive__c, Copay_Prenatal__c,
                               Copay_Mental_Health__c, Copay_Xray_Lab__c, Copay_Inpatient__c,
                               Rx_Deductible__c, Rx_Generic__c, Rx_Preferred__c,
                               Rx_Non_Preferred__c, Rx_Specialty__c
                        FROM Plan_Details__r
                        ORDER BY Plan_Order__c ASC)
                FROM Plan_Comparison__c
                WHERE Comparison_Id__c = :cleanId
                LIMIT 1
            ];

            if (comps.isEmpty()) {
                throw new AuraHandledException('No comparison found with ID: ' + comparisonId);
            }

            Plan_Comparison__c comp = comps[0];

            // Build response map
            Map<String, Object> result = new Map<String, Object>();
            result.put('comparisonId', comp.Comparison_Id__c);
            result.put('mode', comp.Mode__c);
            result.put('taxBracket', comp.Tax_Bracket__c);
            result.put('premiumFrequency', comp.Premium_Frequency__c);

            // Usage
            Map<String, Object> usage = new Map<String, Object>();
            usage.put('usagePcp', comp.Usage_PCP__c);
            usage.put('usageSpecialist', comp.Usage_Specialist__c);
            usage.put('usageUrgentCare', comp.Usage_Urgent_Care__c);
            usage.put('usageER', comp.Usage_ER__c);
            usage.put('usageVirtualPrimary', comp.Usage_Virtual_Primary__c);
            usage.put('usageVirtualUrgent', comp.Usage_Virtual_Urgent__c);
            usage.put('usagePreventive', comp.Usage_Preventive__c);
            usage.put('usagePrenatal', comp.Usage_Prenatal__c);
            usage.put('usageMentalHealth', comp.Usage_Mental_Health__c);
            usage.put('usageXrayLab', comp.Usage_Xray_Lab__c);
            usage.put('usageInpatient', comp.Usage_Inpatient__c);
            usage.put('usageGenericRx', comp.Usage_Generic_Rx__c);
            usage.put('usagePreferredRx', comp.Usage_Preferred_Rx__c);
            usage.put('usageNonPreferredRx', comp.Usage_Non_Preferred_Rx__c);
            usage.put('usageSpecialtyRx', comp.Usage_Specialty_Rx__c);
            result.put('usage', usage);

            // Plans
            List<Map<String, Object>> plans = new List<Map<String, Object>>();
            for (Plan_Detail__c d : comp.Plan_Details__r) {
                Map<String, Object> pm = new Map<String, Object>();
                pm.put('name', d.Name);
                pm.put('isHDHP', d.Is_HDHP__c);
                pm.put('premium', d.Premium__c);
                pm.put('oopm', d.OOPM__c);
                pm.put('deductible', d.Deductible__c);
                pm.put('coinsurance', d.Coinsurance__c);
                pm.put('hsa', d.HSA__c);
                pm.put('employerHsa', d.Employer_HSA__c);
                pm.put('fsa', d.FSA__c);
                pm.put('lpfsa', d.LPFSA__c);
                pm.put('pcpVisit', d.Copay_PCP__c);
                pm.put('specialistVisit', d.Copay_Specialist__c);
                pm.put('urgentCare', d.Copay_Urgent_Care__c);
                pm.put('emergencyRoom', d.Copay_ER__c);
                pm.put('virtualPrimaryCare', d.Copay_Virtual_Primary__c);
                pm.put('virtualUrgentCare', d.Copay_Virtual_Urgent__c);
                pm.put('preventiveCare', d.Copay_Preventive__c);
                pm.put('prenatalCare', d.Copay_Prenatal__c);
                pm.put('mentalHealthVisit', d.Copay_Mental_Health__c);
                pm.put('xrayLabWork', d.Copay_Xray_Lab__c);
                pm.put('inpatient', d.Copay_Inpatient__c);
                pm.put('rxDeductible', d.Rx_Deductible__c);
                pm.put('genericDrug', d.Rx_Generic__c);
                pm.put('preferredDrug', d.Rx_Preferred__c);
                pm.put('nonPreferredDrug', d.Rx_Non_Preferred__c);
                pm.put('specialtyDrug', d.Rx_Specialty__c);
                plans.add(pm);
            }
            result.put('plans', plans);

            return result;

        } catch (AuraHandledException ae) {
            throw ae;
        } catch (Exception e) {
            throw new AuraHandledException('Retrieve failed: ' + e.getMessage());
        }
    }

    // -------------------------------------------------------
    // Helpers
    // -------------------------------------------------------
    private static Decimal toDecimal(Object val) {
        if (val == null || String.valueOf(val).trim() == '') {
            return null;
        }
        try {
            return Decimal.valueOf(String.valueOf(val));
        } catch (Exception e) {
            return null;
        }
    }

    private static String generateUniqueId() {
        String chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O/1/I to avoid confusion
        String result = '';
        for (Integer i = 0; i < 6; i++) {
            Integer idx = Math.mod(Math.abs(Crypto.getRandomInteger()), chars.length());
            result += chars.substring(idx, idx + 1);
        }
        // Verify uniqueness
        List<Plan_Comparison__c> existing = [
            SELECT Id FROM Plan_Comparison__c WHERE Comparison_Id__c = :result LIMIT 1
        ];
        if (!existing.isEmpty()) {
            return generateUniqueId(); // Recursive retry (extremely unlikely collision)
        }
        return result;
    }
}
