# HubCloud Report Template Pack

This folder is generated from the approved project baseline.

## Contents
- `index.html` (HubCloud HTML tab)
- `hc-report.css` (HubCloud Styles tab)
- `script.js` (HubCloud Scripts tab)
- `TRANSFER_MANIFEST.json` (tab mapping + checks)
- docs for workflow and compatibility

## Quick Start
1. Run local checks from project root:
   - `node tools/hubcloud-preflight.js`
   - `node tools/hc-transfer-check.js`
2. Copy files into HubCloud tabs by manifest mapping.
3. Hard refresh in HubCloud (`Ctrl+F5`).

## Rule
Commits are made only after explicit user approval.
