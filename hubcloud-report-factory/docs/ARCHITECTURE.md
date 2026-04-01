# Architecture

## Principle
Start simple and validate each level before adding complexity.

## Maturity Ladder
### Level 0
Single report project with local sandbox and manual transfer.

### Level 1
Factory with:
- base template,
- report spec,
- scaffold tool,
- validation rules.

### Level 2
More automated checks:
- schema checks,
- compatibility checks,
- transfer pack checks,
- print-flow checks.

### Level 3
Evaluator loop:
- builder role,
- evaluator role,
- fix/re-check cycle.

### Level 4
Specialized agents:
- intake,
- data-contract,
- design,
- compatibility,
- QA,
- release.

### Level 5
Orchestrator selects and coordinates specialized roles.

## Human In The Loop
- approve commits,
- approve release,
- approve final design direction,
- resolve ambiguous business logic.
