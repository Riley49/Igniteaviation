# Firebase auto-deploy setup

This project can be published automatically to Firebase Hosting every time you push to `main`.

## 1) One-time Firebase setup (local)

1. Install Firebase CLI:
   ```bash
   npm install -g firebase-tools
   ```
2. Log in:
   ```bash
   firebase login
   ```
3. Replace the placeholder in `.firebaserc`:
   - `YOUR_FIREBASE_PROJECT_ID` -> your real Firebase project id.

## 2) Create GitHub Actions secrets/variable

In your GitHub repository settings:

- **Secret**: `FIREBASE_SERVICE_ACCOUNT`
- **Variable**: `FIREBASE_PROJECT_ID`

Generate the service account secret with:

```bash
firebase login:ci
firebase projects:list
firebase init hosting
firebase serviceaccounts:keys:create firebase-key.json \
  --project YOUR_FIREBASE_PROJECT_ID
```

Then copy the full JSON content from `firebase-key.json` into the `FIREBASE_SERVICE_ACCOUNT` secret.

## 3) Push to deploy

When you push to `main`, GitHub Actions runs:

- `.github/workflows/firebase-hosting-deploy.yml`

You can also deploy manually from the Actions tab with **Run workflow**.

## Optional: manual deploy from your machine

```bash
firebase deploy --only hosting
```

This is useful if you want to publish immediately without waiting for CI.
