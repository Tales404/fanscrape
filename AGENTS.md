# Repository working agreements

## Google Apps Script

- The Apps Script source of truth is `apps-script/`.
- Use `npm run apps-script:status` to inspect the local project mapping.
- Before `npm run apps-script:pull`, make sure local Apps Script changes are committed or otherwise preserved because a pull can overwrite them.
- Never run `clasp push`, create an Apps Script deployment, or execute an import function against the connected Google Sheet without explicit user approval.
- Do not edit Apps Script in the browser and locally at the same time. If an emergency browser edit happens, pull and review it before making further local changes.

## Cloud Run

- Never deploy or change the live Cloud Run service without explicit user approval.
- Keep service URLs and non-secret configuration documented; keep credentials and session material out of tracked files.

## Sensitive files

- Never print or commit `.clasprc.json`, `.clasp.json`, OAuth tokens, session cookies, or credential files.
- Treat `src/config/cookies.json` as sensitive session material even though it is currently tracked in repository history.
