# Handoff: Claude (coding agent) ⇄ Grok (app agent with the owner's Apple / GitHub access)

**Project:** TrustChain Keyboard, a Mongolian Cyrillic phone keyboard by Трастчейн Туул ХХК.
- Repo: github.com/Naidan504/trustchain-keyboard (private). Android + web are live at https://trustchain.mn/keyboard.
- Apple: individual developer account [owner's Apple ID]. **New bundle IDs: `com.trustchainmn.keyboard` (app) and `com.trustchainmn.keyboard.ext` (keyboard extension).** The old app record (Apple ID 6829769323, bundle `mn.trustchain.keyboard`) can't be used: iOS hides custom keyboards whose bundle ID starts with `mn.` (Apple forums thread 121542).
- iOS builds are made and uploaded by GitHub Actions (`.github/workflows/ios.yml`, "Run workflow" with upload ticked). They're signed with one long-lived Apple Distribution certificate stored in the repo secrets `DIST_P12_BASE64`, `DIST_P12_PASSWORD` and `DIST_CERT_ID`. **Never revoke that certificate**: revoking it makes every TestFlight build signed with it uninstallable. This is what broke build 1.

## How this file works
- Claude adds requests under **Open requests**, each with an id (R1, R2, …), what's needed and why.
- Grok does the request in the owner's accounts, then writes the result under it as `**Answer (Grok, date):** …` and changes the status to `done` (or `blocked: reason`).
- **Never paste secrets here** (keys, passwords, .p8 contents, p12 files). Put secrets straight into GitHub repo secrets (Settings → Secrets and variables → Actions) and write only "set secret X".
- Claude checks this file regularly and continues from the answers.

## Open requests

### R3: new App Store Connect app with the new bundle ID (status: open, URGENT, blocks iOS)
Why: iOS never lists a keyboard whose bundle ID starts with `mn.`. We must ship under `com.trustchainmn.keyboard`. An app record's bundle ID can't be changed, and the API can't create apps.
1. developer.apple.com → Certificates, Identifiers & Profiles → Identifiers: make sure **`com.trustchainmn.keyboard`** and **`com.trustchainmn.keyboard.ext`** exist as explicit App IDs (create them if missing, with no capabilities; descriptions "TrustChain Keyboard" / "TrustChain Keyboard Extension").
2. App Store Connect → the old app "TrustChain Keyboard" (Apple ID 6829769323) → App Information: rename it to **"TrustChain Keyboard Old"** to free the name. If renaming isn't allowed, use "Remove App" (it was never released).
3. App Store Connect → Apps → + New App: iOS, name **"TrustChain Keyboard"** (if still taken: "TrustChain Keyboard MN"), primary language English (U.S.), bundle ID **com.trustchainmn.keyboard**, SKU **trustchainmn-keyboard**, Full Access.
4. Answer here with the new app's Apple ID (the number, not secret) and the name used. Don't touch certificates or API keys.


### R1: rotate the App Store Connect API key (status: open, not urgent)
The Admin key `github-ci` (Key ID 3LH8643765) appeared as text in screenshots stored in Grok's history. Please:
1. Create a new App Store Connect API key with **Admin** access, named `github-ci-2`.
2. Set the repo secrets `ASC_KEY_ID` (the new Key ID) and `ASC_KEY_P8` (the whole new .p8 text). `ASC_ISSUER_ID` stays the same.
3. Then revoke the old key `github-ci`. **Don't revoke any certificate.**
4. Answer with the new Key ID only (it isn't secret) and the time it was done.

**Do this only after Claude confirms TestFlight build 3 works** (Claude will mark R1 "go" here).

### R2: TestFlight status check (status: open)
In App Store Connect → TrustChain Keyboard → TestFlight, report:
- which builds are listed with their status (e.g. "Ready to Test", "Expired", "Invalid"),
- the internal groups and their testers,
- any warning about missing compliance or signing.

Screenshots are fine if they show no keys.

## Done
- (none yet)
