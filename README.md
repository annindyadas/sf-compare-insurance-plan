# 🏥 Health Insurance Plan Compare

A free, open-source **Salesforce LWC application** that helps users compare health insurance plans side-by-side to find the most cost-effective option. Built for deployment on **Salesforce LWR Experience Sites**.

[![Try Now](https://img.shields.io/badge/🚀_Try_Now-Live_Demo-0176d3?style=for-the-badge)](https://annindyadas.my.site.com/compareplan/)

![Salesforce](https://img.shields.io/badge/Salesforce-LWC-00A1E0?logo=salesforce&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-green)

---

## ✨ Features

- **Two Comparison Modes**
  - **Basic Mode** – Quick worst-case comparison using premium + out-of-pocket max
  - **Advanced Mode** – Detailed analysis with copays, deductibles, coinsurance, Rx costs, and expected annual usage

- **Up to 5 Plans** – Compare 2–5 plans side-by-side with horizontal scrolling

- **Smart Calculations**
  - Annual premium normalization (bi-weekly, semi-monthly, monthly)
  - Tax savings from HSA, FSA, LP-FSA contributions
  - Employer HSA contribution offsets
  - Expected out-of-pocket costs based on your usage
  - OOPM cap enforcement
  - Net effective annual cost ranking

- **Save & Retrieve** – Save comparisons to Salesforce with a unique 6-character code; reload anytime

- **No PII Stored** – Only plan cost details are saved. Completely free to use.

---

## 🏗️ Project Structure

```
force-app/main/default/
├── lwc/
│   ├── planCompareApp/         # Parent container – header, mode toggle, retrieve bar, footer
│   ├── planCompareBasic/       # Basic mode orchestrator
│   ├── planCompareAdvanced/    # Advanced mode orchestrator + shared usage panel
│   ├── planCard/               # Basic plan input card
│   ├── planAdvancedCard/       # Advanced plan input card (4 collapsible sections)
│   ├── planCalcEngine/         # JS-only calculation utility
│   ├── planComparisonResults/  # Basic mode results display
│   └── planAdvancedResults/    # Advanced mode results display
├── classes/
│   ├── PlanComparisonController.cls       # Apex controller (save/update/retrieve)
│   ├── PlanComparisonController.cls-meta.xml
│   ├── PlanComparisonControllerTest.cls   # Test class (5 test methods)
│   └── PlanComparisonControllerTest.cls-meta.xml
├── layouts/
│   ├── Plan_Comparison__c-Plan Comparison Layout.layout-meta.xml
│   └── Plan_Detail__c-Plan Detail Layout.layout-meta.xml
├── tabs/
│   └── Plan_Comparison__c.tab-meta.xml
└── objects/
    ├── Plan_Comparison__c/     # Parent object – comparison metadata + usage fields
    │   ├── fields/             # 19 custom fields
    │   └── listViews/          # All records list view
    └── Plan_Detail__c/         # Child object – individual plan data
        └── fields/             # 26 custom fields
```

---

## 🚀 Deployment to a Salesforce Org

### Prerequisites

- [Salesforce CLI (sf)](https://developer.salesforce.com/tools/salesforcecli)
- A Salesforce org (scratch org, sandbox, or Developer Edition)
- [VS Code](https://code.visualstudio.com/) with [Salesforce Extension Pack](https://marketplace.visualstudio.com/items?itemName=salesforce.salesforcedx-vscode)

### Steps

1. **Clone the repository**
   ```bash
   git clone https://github.com/annindyadas/sf-compare-insurance-plan.git
   cd sf-compare-insurance-plan
   ```

2. **Authorize your org**
   ```bash
   sf org login web --set-default --alias myorg
   ```

3. **Deploy the source**
   ```bash
   sf project deploy start --target-org myorg
   ```

4. **Assign permissions** (if needed)
   - Grant Read/Create/Edit access on `Plan_Comparison__c` and `Plan_Detail__c` to the appropriate profiles or permission sets
   - For Experience Site guest users, ensure the Apex class `PlanComparisonController` is granted access via Guest User Profile

5. **Add to an Experience Site (LWR)**
   - Open **Experience Builder**
   - Drag the **planCompareApp** component onto a page
   - Publish the site

### Using a Scratch Org

```bash
sf org create scratch --definition-file config/project-scratch-def.json --alias plancompare --set-default --duration-days 30
sf project deploy start
sf org open
```

---

## 🧮 How It Works

### Basic Mode

Calculates **worst-case annual cost** per plan:

```
Net Cost = Annual Premium + OOPM − HSA Employer Contribution − Tax Savings
```

### Advanced Mode

Calculates **expected annual cost** based on your projected healthcare usage:

```
Expected OOP = Σ (copay × visits) + coinsurance share, capped at OOPM
Net Cost = Annual Premium + Expected OOP + Rx Costs − Employer HSA − Tax Savings
```

---

## 🛠️ Custom Objects

### Plan_Comparison__c (Parent)

| Field | Type | Purpose |
|-------|------|---------|
| `Comparison_Id__c` | Text (Unique, External ID) | 6-character retrieval code |
| `Mode__c` | Picklist | Basic or Advanced |
| `Tax_Bracket__c` | Number | Federal tax rate |
| `Premium_Frequency__c` | Text | bi-weekly, semi-monthly, monthly |
| `Usage_*__c` (×15) | Number | Expected annual usage counts |

### Plan_Detail__c (Child)

| Field | Type | Purpose |
|-------|------|---------|
| `Plan_Comparison__c` | Master-Detail | Link to parent comparison |
| `Plan_Order__c` | Number | Display order |
| `Premium__c`, `Deductible__c`, `OOPM__c` | Currency | Core plan costs |
| `Coinsurance__c` | Percent | Cost sharing rate |
| `HSA__c`, `Employer_HSA__c`, `FSA__c`, `LPFSA__c` | Currency | Tax-advantaged accounts |
| `Copay_*__c` (×11) | Currency | Medical service copays |
| `Rx_*__c` (×5) | Currency | Prescription drug costs |

---

## 📝 License

This project is open source and available under the [MIT License](LICENSE).

## 👤 Author

**Annindya Das**

- Portfolio: [annindyadas.my.site.com/portfolio](https://annindyadas.my.site.com/portfolio/)
- GitHub: [@annindyadas](https://github.com/annindyadas)
