# Push Notifications Setup - Completion Status

## ✅ Completed Automatically

1. **app.json Configuration**
   - ✅ Added `extra.eas.projectId` field structure
   - ✅ Added `googleServicesFile: "./google-services.json"` to Android config
   - ⚠️ **TODO**: Replace `"YOUR_PROJECT_ID_HERE"` with actual project ID

2. **eas.json Created**
   - ✅ Development profile configured
   - ✅ Preview profile configured
   - ✅ Production profile configured

3. **google-services.json**
   - ✅ File is present in `mobile/` directory
   - ✅ Package name matches: `com.wai.mobile`
   - ✅ Firebase project configured: `wai1-ac065`

4. **Code Implementation**
   - ✅ `mobile/lib/notifications.ts` already reads project ID from Constants
   - ✅ Error handling for missing project ID is in place

## 📋 Manual Steps Required

### Step 1: Get Your Expo Project ID

You are logged in as: **ahmedss7**

**Option A: From Expo Dashboard**
1. Visit: https://expo.dev/accounts/ahmedss7/projects
2. Find project with slug `w-ai-mobile` or create a new one
3. Copy the Project ID (UUID format like `b77530dc-352b-424f-f730-8300f975178b`)

**Option B: Using EAS CLI** (Recommended)
```bash
# First install EAS CLI (using bun)
bun install -g eas-cli

# Or use npx without installation
npx eas-cli@latest project:init

# Log in to EAS
eas login

# Navigate to mobile directory
cd mobile

# Initialize/link project (this will create or link existing project)
eas project:init
# Follow prompts to create new project or link existing one
# The project ID will be automatically added to app.json

# Or if you know the project ID:
eas project:init --id <your-project-id>
```

**Option C: Manual Entry**
- If you know your project ID from the dashboard, just edit `app.json` directly

### Step 2: Update app.json

After getting your project ID:
1. Open `mobile/app.json`
2. Find line 43: `"projectId": "YOUR_PROJECT_ID_HERE"`
3. Replace `"YOUR_PROJECT_ID_HERE"` with your actual project ID
4. Save the file

### Step 3: Install and Configure EAS CLI

```bash
# Install EAS CLI globally (using bun)
bun install -g eas-cli

# Or use npx without installation
npx eas-cli@latest

# Log in to EAS (if not already logged in)
eas login

# Navigate to mobile directory
cd mobile

# Configure Android credentials
eas credentials

# Select:
# - Platform: Android
# - Credential type: Push Notifications / FCM
# - Choose: Automatic management (recommended) or Manual upload
```

### Step 4: Build and Test

```bash
cd mobile

# Build development build for Android
eas build --profile development --platform android

# Wait for build to complete, then install on physical Android device
# (Push notifications don't work on emulators)

# Test push notification registration
# Check console for: "Expo push token: [token]"

# Send test notification using:
# https://expo.dev/notifications
```

## ✅ Verification Checklist

- [x] `google-services.json` added to `mobile/` directory
- [x] `app.json` has `googleServicesFile` reference
- [x] `app.json` has `extra.eas.projectId` structure
- [ ] **Project ID added to `app.json` (replace placeholder)**
- [x] `eas.json` created with build profiles
- [ ] EAS CLI installed (`npm install -g eas-cli`)
- [ ] Logged in to EAS (`eas login`)
- [ ] Android FCM credentials configured (`eas credentials`)
- [ ] Development build created (`eas build --profile development --platform android`)
- [ ] App installed on physical Android device
- [ ] Push notification registration successful
- [ ] Test notification sent and received

## 🔍 Quick Verification Commands

```bash
# Check if project ID is set
cd mobile
npx expo config --type public | grep projectId

# Verify google-services.json is accessible
ls -la mobile/google-services.json

# Check EAS CLI installation
eas --version

# Verify login status
eas whoami
```

## 📝 Important Notes

1. **Project ID Format**: Must be a valid UUID (GUID format), e.g., `b77530dc-352b-424f-f730-8300f975178b`

2. **Physical Device Required**: Android push notifications **do not work** on emulators. You must test on a real Android device.

3. **EAS Build Required**: Full push notification support requires an EAS Build, not Expo Go. Expo Go has limited push notification support.

4. **Development vs Production**:
   - **Development Build**: Full push support, use for testing
   - **Production Build**: Use for app store releases
   - **Expo Go**: Limited push support, project ID helps but not full functionality

5. **Firebase Configuration**: The `google-services.json` file is already configured with:
   - Package name: `com.wai.mobile` ✅
   - Firebase project: `wai1-ac065` ✅
   - API keys are present ✅

## 🚀 Next Steps

1. **Get your Expo Project ID** (see Step 1 above)
2. **Update app.json** with the actual project ID
3. **Run `eas credentials`** to configure FCM
4. **Build development build** and test on device

## 📚 Resources

- [Expo Push Notifications Docs](https://docs.expo.dev/push-notifications/overview/)
- [EAS Build Docs](https://docs.expo.dev/build/introduction/)
- [Expo Push Notification Tool](https://expo.dev/notifications)
- [Firebase Console](https://console.firebase.google.com/)
