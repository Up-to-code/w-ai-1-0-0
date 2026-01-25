# Push Notifications Setup Guide

This guide will help you complete the setup for Android push notifications.

## Current Status

✅ Configuration files have been created and configured:
- `app.json` - Added `extra.eas.projectId` field structure (needs your actual project ID)
- `app.json` - Added `googleServicesFile` reference to Android config
- `eas.json` - EAS Build configuration created with development, preview, and production profiles
- `google-services.json` - Firebase configuration file is in place

⚠️ **Action Required**: Replace `"YOUR_PROJECT_ID_HERE"` in `app.json` with your actual Expo project ID

## Next Steps (Manual Actions Required)

### 1. Get Your Expo Project ID

1. **Log in to Expo**:
   ```bash
   cd mobile
   npx expo login
   ```

2. **Check your projects**:
   - Visit: https://expo.dev/accounts/[YOUR_ACCOUNT]/projects
   - Or run: `npx expo whoami` to see your account

3. **Find or create project**:
   - **Option A: From Expo Dashboard** (Recommended)
     - Visit: https://expo.dev/accounts/ahmedss7/projects
     - Find your project with slug `w-ai-mobile` or create a new one
     - Copy the Project ID (UUID format like `b77530dc-352b-424f-f730-8300f975178b`)
   
   - **Option B: Using EAS CLI** (After installing EAS CLI)
     ```bash
     # Install EAS CLI first (using bun)
     bun install -g eas-cli
     
     # Or use npx without installation
     npx eas-cli@latest project:init
     
     # Log in to EAS
     eas login
     
     # Initialize/link project (this will create or link existing project)
     eas project:init
     # Or if you know the project ID:
     eas project:init --id <your-project-id>
     ```
   
   - **Option C: Manual Entry**
     - If you know your project ID, just add it directly to `app.json`

4. **Update app.json**:
   - Open `mobile/app.json`
   - Replace `"YOUR_PROJECT_ID_HERE"` with your actual project ID in the `extra.eas.projectId` field

### 2. Install EAS CLI

```bash
# Using bun (recommended)
bun install -g eas-cli

# Or using npm with sudo (if needed)
sudo npm install -g eas-cli

# Or using npx (no installation needed)
npx eas-cli@latest
```

### 3. Configure Android FCM Credentials

1. **Log in to EAS**:
   ```bash
   eas login
   ```

2. **Configure credentials**:
   ```bash
   cd mobile
   eas credentials
   ```

3. **Follow the prompts**:
   - Select **Android** platform
   - Select **Push Notifications** or **FCM** option
   - Choose one of:
     - **Automatic management** (recommended) - EAS will handle credentials
     - **Manual upload** - Upload your `google-services.json` file

### 4. Firebase Setup (if using manual FCM)

If you choose manual FCM setup:

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project or select existing
3. Add Android app with package name: `com.wai.mobile`
4. Download `google-services.json`
5. Place it in the `mobile/` directory
6. Update `app.json` to reference it (optional):
   ```json
   "android": {
     "googleServicesFile": "./google-services.json"
   }
   ```

### 5. Test Push Notifications

1. **Restart Expo development server**:
   ```bash
   cd mobile
   npm start
   ```

2. **Build development build** (for full push support):
   ```bash
   eas build --profile development --platform android
   ```

3. **Install on physical Android device** (emulators don't support push notifications)

4. **Test registration**:
   - The app should now successfully register for push notifications
   - Check console logs for: "Expo push token: [token]"

5. **Send test notification**:
   - Use [Expo Push Notification Tool](https://expo.dev/notifications)
   - Enter your push token and send a test notification

## Verification Checklist

- [ ] Project ID added to `app.json` (replaced `YOUR_PROJECT_ID_HERE`)
- [ ] EAS CLI installed (`npm install -g eas-cli`)
- [ ] Logged in to EAS (`eas login`)
- [ ] Android FCM credentials configured (`eas credentials`)
- [ ] `google-services.json` added (if using manual setup)
- [ ] Development build created and installed on Android device
- [ ] Push notification registration successful
- [ ] Test notification received

## Important Notes

- **Physical Device Required**: Android push notifications don't work on emulators
- **EAS Build Required**: Full push notification support requires EAS Build, not Expo Go
- **Project ID Format**: Must be valid UUID (GUID format)
- **Expo Go Limitations**: Push notifications are limited in Expo Go, use development build for full support

## Troubleshooting

### "No projectId found" error
- Make sure you've replaced `YOUR_PROJECT_ID_HERE` with your actual project ID
- Restart the Expo development server after updating `app.json`
- Verify project ID is accessible: Check `Constants.expoConfig?.extra?.eas?.projectId` in code

### Push notifications not working
- Ensure you're using a development build, not Expo Go
- Verify FCM credentials are properly configured via `eas credentials`
- Check that you're testing on a physical Android device (not emulator)
- Verify notification permissions are granted in device settings

## Support

For more information:
- [Expo Push Notifications Docs](https://docs.expo.dev/push-notifications/overview/)
- [EAS Build Docs](https://docs.expo.dev/build/introduction/)
- [Firebase Console](https://console.firebase.google.com/)
