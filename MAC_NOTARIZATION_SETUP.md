# macOS Signing + Notarization Setup

This project is configured to sign and notarize macOS builds in GitHub Actions.

## What Is Already Configured

- `electron-builder.json5`
  - `mac.hardenedRuntime = true`
  - mac entitlements file set
  - `afterSign` hook points to `scripts/notarize.cjs`
- `scripts/notarize.cjs`
  - Runs notarization on mac builds
  - Fails CI when `REQUIRE_MAC_NOTARIZATION=true` and credentials are missing
- `.github/workflows/release-mac.yml`
- `.github/workflows/release-all.yml`
  - Both workflows now inject signing/notary secrets and validate they exist

## One-Time Apple Requirements

1. Join Apple Developer Program (individual or organization).
2. Create a `Developer ID Application` certificate.
3. Export that certificate as `.p12` with a password.
4. Create an app-specific password for your Apple ID.

## GitHub Secrets You Must Add

Set these repository secrets:

- `MAC_CERTS`: base64-encoded contents of your `.p12` certificate file
- `MAC_CERTS_PASSWORD`: password used when exporting the `.p12`
- `APPLE_ID`: your Apple ID email
- `APPLE_APP_SPECIFIC_PASSWORD`: app-specific password from Apple ID settings
- `APPLE_TEAM_ID`: your Apple Developer Team ID

## How To Create `MAC_CERTS`

On a machine that has your `.p12` file:

### macOS

```bash
base64 -i DeveloperID_Application.p12 | pbcopy
```

### Linux

```bash
base64 -w 0 DeveloperID_Application.p12
```

### Windows PowerShell

```powershell
[Convert]::ToBase64String([IO.File]::ReadAllBytes("DeveloperID_Application.p12"))
```

Copy the full output into `MAC_CERTS`.

## Release Flow

1. Bump version in `package.json`.
2. Run GitHub Actions workflow:
   - `Release (macOS to itch)` for mac-only upload
   - or `Release All Platforms` for full release
3. If any required secret is missing, the workflow fails before upload.

## Verification Checklist

After workflow completes, test on a clean macOS machine:

1. Download the new `.dmg`
2. Install to Applications
3. Launch normally (without Terminal quarantine command)
4. Confirm Gatekeeper accepts the app

Optional local checks on macOS:

```bash
spctl -a -vv "/Applications/College Basketball Dynasty (BETA).app"
codesign --verify --deep --strict --verbose=2 "/Applications/College Basketball Dynasty (BETA).app"
```
