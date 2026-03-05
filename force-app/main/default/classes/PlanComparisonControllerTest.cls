/**
 * PlanComparisonControllerTest
 * Unit tests for the PlanComparisonController Apex class.
 */
@IsTest
private class PlanComparisonControllerTest {

    @IsTest
    static void testSaveAndRetrieveBasic() {
        // Build payload
        Map<String, Object> payload = new Map<String, Object>();
        payload.put('mode', 'Basic');
        payload.put('premiumFrequency', 'monthly');
        payload.put('taxBracket', '22');

        List<Map<String, Object>> plans = new List<Map<String, Object>>();

        Map<String, Object> plan1 = new Map<String, Object>();
        plan1.put('name', 'Plan A');
        plan1.put('isHDHP', false);
        plan1.put('premium', '250');
        plan1.put('oopm', '5000');
        plan1.put('hsa', '');
        plan1.put('fsa', '1000');
        plans.add(plan1);

        Map<String, Object> plan2 = new Map<String, Object>();
        plan2.put('name', 'Plan B');
        plan2.put('isHDHP', true);
        plan2.put('premium', '150');
        plan2.put('oopm', '7000');
        plan2.put('hsa', '3000');
        plan2.put('employerHsa', '500');
        plans.add(plan2);

        payload.put('plans', plans);

        Test.startTest();
        String comparisonId = PlanComparisonController.saveComparison(JSON.serialize(payload));
        Test.stopTest();

        // Verify the comparison ID was returned
        System.assertNotEquals(null, comparisonId, 'Comparison ID should not be null');
        System.assertEquals(6, comparisonId.length(), 'Comparison ID should be 6 characters');

        // Retrieve it
        Map<String, Object> result = PlanComparisonController.getComparison(comparisonId);
        System.assertEquals('Basic', result.get('mode'));
        System.assertEquals('monthly', result.get('premiumFrequency'));

        List<Object> resultPlans = (List<Object>) result.get('plans');
        System.assertEquals(2, resultPlans.size(), 'Should have 2 plans');
    }

    @IsTest
    static void testSaveAndRetrieveAdvanced() {
        Map<String, Object> payload = new Map<String, Object>();
        payload.put('mode', 'Advanced');
        payload.put('premiumFrequency', 'biweekly');
        payload.put('taxBracket', '24');

        // Usage
        payload.put('usagePcp', '4');
        payload.put('usageSpecialist', '2');
        payload.put('usageUrgentCare', '1');
        payload.put('usageER', '0');
        payload.put('usageGenericRx', '12');
        payload.put('usagePreferredRx', '6');

        List<Map<String, Object>> plans = new List<Map<String, Object>>();

        Map<String, Object> plan1 = new Map<String, Object>();
        plan1.put('name', 'PPO Gold');
        plan1.put('isHDHP', false);
        plan1.put('premium', '400');
        plan1.put('deductible', '1000');
        plan1.put('oopm', '8000');
        plan1.put('coinsurance', '20');
        plan1.put('fsa', '2850');
        plan1.put('pcpVisit', '25');
        plan1.put('specialistVisit', '50');
        plan1.put('urgentCare', '75');
        plan1.put('emergencyRoom', '250');
        plan1.put('genericDrug', '10');
        plan1.put('preferredDrug', '35');
        plans.add(plan1);

        Map<String, Object> plan2 = new Map<String, Object>();
        plan2.put('name', 'HDHP Bronze');
        plan2.put('isHDHP', true);
        plan2.put('premium', '180');
        plan2.put('deductible', '3000');
        plan2.put('oopm', '7050');
        plan2.put('coinsurance', '30');
        plan2.put('hsa', '4150');
        plan2.put('employerHsa', '750');
        plan2.put('genericDrug', '15');
        plan2.put('rxDeductible', '200');
        plans.add(plan2);

        payload.put('plans', plans);

        Test.startTest();
        String comparisonId = PlanComparisonController.saveComparison(JSON.serialize(payload));
        Test.stopTest();

        System.assertNotEquals(null, comparisonId);

        Map<String, Object> result = PlanComparisonController.getComparison(comparisonId);
        System.assertEquals('Advanced', result.get('mode'));
        System.assertEquals('biweekly', result.get('premiumFrequency'));

        Map<String, Object> usage = (Map<String, Object>) result.get('usage');
        System.assertEquals(4.0, (Decimal) usage.get('usagePcp'));

        List<Object> resultPlans = (List<Object>) result.get('plans');
        System.assertEquals(2, resultPlans.size());

        // Verify first plan data
        Map<String, Object> firstPlan = (Map<String, Object>) resultPlans[0];
        System.assertEquals('PPO Gold', firstPlan.get('name'));
    }

    @IsTest
    static void testRetrieveNotFound() {
        Boolean exceptionThrown = false;
        try {
            PlanComparisonController.getComparison('ZZZZZ9');
        } catch (AuraHandledException e) {
            exceptionThrown = true;
        }
        System.assert(exceptionThrown, 'Should throw exception for invalid ID');
    }

    @IsTest
    static void testSaveInvalidPayload() {
        Boolean exceptionThrown = false;
        try {
            PlanComparisonController.saveComparison('not valid json');
        } catch (AuraHandledException e) {
            exceptionThrown = true;
        }
        System.assert(exceptionThrown, 'Should throw exception for invalid JSON');
    }

    @IsTest
    static void testUpdateExistingComparison() {
        // First create a comparison
        Map<String, Object> payload = new Map<String, Object>();
        payload.put('mode', 'Basic');
        payload.put('premiumFrequency', 'monthly');
        payload.put('taxBracket', '22');

        List<Map<String, Object>> plans = new List<Map<String, Object>>();
        Map<String, Object> plan1 = new Map<String, Object>();
        plan1.put('name', 'Original Plan');
        plan1.put('isHDHP', false);
        plan1.put('premium', '200');
        plan1.put('oopm', '5000');
        plans.add(plan1);
        payload.put('plans', plans);

        String comparisonId = PlanComparisonController.saveComparison(JSON.serialize(payload));

        // Now update with different data
        Map<String, Object> updatedPayload = new Map<String, Object>();
        updatedPayload.put('mode', 'Basic');
        updatedPayload.put('premiumFrequency', 'biweekly');
        updatedPayload.put('taxBracket', '32');

        List<Map<String, Object>> updatedPlans = new List<Map<String, Object>>();
        Map<String, Object> updPlan1 = new Map<String, Object>();
        updPlan1.put('name', 'Updated Plan A');
        updPlan1.put('isHDHP', true);
        updPlan1.put('premium', '300');
        updPlan1.put('oopm', '7000');
        updPlan1.put('hsa', '4000');
        updatedPlans.add(updPlan1);

        Map<String, Object> updPlan2 = new Map<String, Object>();
        updPlan2.put('name', 'Updated Plan B');
        updPlan2.put('isHDHP', false);
        updPlan2.put('premium', '400');
        updPlan2.put('oopm', '4000');
        updatedPlans.add(updPlan2);

        updatedPayload.put('plans', updatedPlans);

        Test.startTest();
        PlanComparisonController.updateComparison(comparisonId, JSON.serialize(updatedPayload));
        Test.stopTest();

        // Retrieve and verify update
        Map<String, Object> result = PlanComparisonController.getComparison(comparisonId);
        System.assertEquals('biweekly', result.get('premiumFrequency'), 'Frequency should be updated');

        List<Object> resultPlans = (List<Object>) result.get('plans');
        System.assertEquals(2, resultPlans.size(), 'Should now have 2 plans');

        Map<String, Object> firstPlan = (Map<String, Object>) resultPlans[0];
        System.assertEquals('Updated Plan A', firstPlan.get('name'), 'Plan name should be updated');
    }
}
