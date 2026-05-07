# Firebase auto-deploy setup

This project can be published automatically to Firebase Hosting project `human-slot-9353c` every time you push to `main`.

## 1) One-time Firebase setup (local)

1. Install Firebase CLI:
   ```bash
   npm install -g firebase-tools
   ```
2. Log in:
   ```bash
   firebase login
   ```
3. The Firebase project is pinned in `.firebaserc` as `human-slot-9353c`.

## 2) Create GitHub Actions secret

In your GitHub repository settings, add this secret:

- **Secret**: `FIREBASE_SERVICE_ACCOUNT`

### How to get `FIREBASE_SERVICE_ACCOUNT`

Use Firebase Console (recommended):

1. Go to Firebase Console -> select project `human-slot-9353c` -> **Project settings** -> **Service accounts**.
2. Click **Generate new private key**.
3. Download the JSON file.
4. Copy the full JSON content into the GitHub secret named `FIREBASE_SERVICE_ACCOUNT`.

> Note: `serviceaccounts:keys:create` is **not** a Firebase CLI command.

## 3) Push to deploy

When you push to `main`, GitHub Actions runs:

- `.github/workflows/firebase-hosting-deploy.yml`

You can also deploy manually from the Actions tab with **Run workflow**.

## Optional: manual deploy from your machine

```bash
firebase deploy --only hosting
```

This is useful if you want to publish immediately without waiting for CI.
