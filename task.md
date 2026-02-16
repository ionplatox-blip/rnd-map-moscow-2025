# Task Checklist: R&D Centers Map of Moscow

- [x] Phase 1: Planning
    - [x] Analyze data structure (IKRBS, RID, IKSI, IKSPO)
    - [x] Design enriched data model
- [x] Phase 2: Data Preprocessing
    - [x] Extract project funding (`finance_total`)
    - [x] Calculate project status (`status`)
    - [x] Link RID usage data (`usage`)
    - [x] Fix geocoding output paths
    - [x] Run full preprocessing pipeline
- [x] Phase 3: Web Application
    - [x] Update TypeScript types (`CenterDetail`)
    - [x] Modify Sidebar: Add status/finance badges, usage icons
    - [x] Modify ProjectModal: Add detailed status/funding info
    - [x] Rename "About" to "Описание R&D центра"
    - [x] Add CSS for new badges and indicators
- [x] Phase 4: Verification
    - [x] Verify data presence in generated JSON files
    - [x] Verify UI rendering in browser
    - [ ] Final polishing (optional)

## Next Steps
1. implement AI Search functionality (if requested)
2. Add more advanced filters (e.g. by status, funding range)
3. Improve geocoding accuracy for remaining organizations
