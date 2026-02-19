# Mobile App Setup Guide

## Quick Start

1. **Environment Setup**
   ```bash
   cd mobile
   # .env file is already created with your Convex URL
   ```

2. **Install Dependencies** (if not already done)
   ```bash
   npm install
   ```

3. **Start Development Server**
   ```bash
   npm start
   ```

4. **Run on Device/Simulator**
   - Press `i` for iOS Simulator
   - Press `a` for Android Emulator
   - Or scan QR code with Expo Go app on your phone

## Environment Variables

The `.env` file contains:
```
EXPO_PUBLIC_CONVEX_URL=https://hardy-gopher-480.convex.cloud
```

This connects the mobile app to your Convex backend.

## Testing Authentication

1. **Email/Password Login**
   - Use existing credentials from web app
   - Or register a new account

2. **Biometric Authentication**
   - Requires a development build (not available in Expo Go)
   - To test biometrics, create a development build:
     ```bash
     npx expo prebuild
     npx expo run:ios  # or run:android
     ```

## Features Available

✅ **Chat List**
- View all chats
- Search functionality
- Last message preview
- Unread count badges

✅ **Chat Conversation**
- Send/receive messages
- Message history with pagination
- WhatsApp-style message bubbles
- Real-time updates

✅ **Customer Management**
- View all customers
- Search customers
- Add new customers
- Tag management

## Troubleshooting

**Convex Connection Issues**
- Verify `.env` file exists and has correct URL
- Check that Convex backend is running
- Restart Expo dev server after changing `.env`

**TypeScript Errors**
- Some type errors are expected with FlashList types
- App will still run correctly
- Can be ignored for now

**Biometric Auth Not Working**
- Biometric auth requires a development build
- Use email/password login in Expo Go
- Create development build for full biometric support

## Next Steps

1. Test the app on a physical device or simulator
2. Verify chat functionality works with your Convex backend
3. Test customer management features
4. Create development build for biometric authentication testing
