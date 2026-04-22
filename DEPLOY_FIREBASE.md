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

### How to get `FIREBASE_PROJECT_ID`

Use one of these:

- Firebase Console -> **Project settings** -> copy **Project ID**
- CLI:
  ```bash
  firebase projects:list
  ```

### How to get `FIREBASE_SERVICE_ACCOUNT`

Use Firebase Console (recommended):

1. Go to Firebase Console -> **Project settings** -> **Service accounts**.
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
