# W-AI Mobile App

React Native mobile application built with Expo for chat and customer management.

## Features

- **Biometric Authentication**: Face ID/Touch ID support with fallback to email/password
- **Chat Management**: View chats, send/receive messages via WhatsApp
- **Customer Management**: View and add customers
- **Performance**: FlashList for smooth scrolling with thousands of items
- **Real-time Updates**: Convex backend integration for live data

## Setup

### Prerequisites

- Node.js 18+
- Expo CLI (`npm install -g expo-cli`)
- iOS Simulator (for iOS) or Android Emulator (for Android)

### Installation

1. Install dependencies:
```bash
cd mobile
npm install
```

2. Set up environment variables:
```bash
cp .env.example .env
```

Edit `.env` and add your Convex deployment URL:
```
EXPO_PUBLIC_CONVEX_URL=https://your-deployment.convex.cloud
```

3. Start the development server:
```bash
npm start
```

4. Run on device/simulator:
- Press `i` for iOS simulator
- Press `a` for Android emulator
- Scan QR code with Expo Go app on your phone

## Project Structure

```
mobile/
├── app/                    # Expo Router pages
│   ├── (auth)/            # Authentication screens
│   ├── (tabs)/            # Tab navigation (Chats, Customers)
│   ├── chat/[id].tsx      # Chat conversation screen
│   └── customers/         # Customer management screens
├── components/            # Reusable components
│   ├── auth/              # Authentication components
│   ├── chat/              # Chat-related components
│   └── customers/         # Customer-related components
├── hooks/                 # Custom React hooks
├── lib/                   # Utilities and configurations
└── app.json               # Expo configuration
```

## Key Technologies

- **Expo**: React Native framework
- **Expo Router**: File-based routing
- **Convex**: Backend as a service
- **FlashList**: High-performance list component
- **Expo Local Authentication**: Biometric auth
- **Expo Secure Store**: Secure token storage

## Architecture

The mobile app uses the same Convex backend as the web application:
- Same API endpoints
- Same data models
- Real-time synchronization
- No backend changes needed

## Performance Optimizations

- FlashList for efficient list rendering
- Pagination for large datasets
- Memoized filtering and sorting
- Optimized re-renders

## Development

### Running on Device

1. Install Expo Go app on your phone
2. Start the dev server: `npm start`
3. Scan QR code with Expo Go

### Building for Production

```bash
# iOS
eas build --platform ios

# Android
eas build --platform android
```

## Notes

- Biometric authentication requires a development build (not available in Expo Go)
- Set `EXPO_PUBLIC_CONVEX_URL` in your environment for Convex integration
- The app follows the same UI principles as the web version: simple, clean, fast, focused
