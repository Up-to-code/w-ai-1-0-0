# Run This Command Now

EAS CLI is installed and you're logged in as **ahmedss7**. 

## Get Your Project ID

Run this command in the `mobile` directory:

```bash
cd mobile
eas project:init
```

**Follow the prompts:**
1. It will ask: "Would you like to create a project for @ahmedss7/w-ai-mobile?"
   - Type: **y** (yes)
2. It will create/link the project
3. The project ID will be **automatically added** to `app.json`

## After Running the Command

1. Check that `app.json` now has a real project ID:
   ```bash
   cat app.json | grep projectId
   ```
   You should see a UUID instead of "YOUR_PROJECT_ID_HERE"

2. Verify the project ID is accessible:
   ```bash
   npx expo config --type public | grep projectId
   ```

## Next Steps After Project ID is Set

1. Configure Android FCM credentials:
   ```bash
   eas credentials
   ```
   - Select: **Android**
   - Select: **Push Notifications** or **FCM**
   - Choose: **Automatic management** (recommended)

2. Build development build:
   ```bash
   eas build --profile development --platform android
   ```

3. Install on physical Android device and test push notifications
