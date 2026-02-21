# Android Runtime Crash Runbook (Expo + Convex)

This runbook helps you capture Android startup crashes and store production telemetry in Convex.

## 1) Capture the real Android fatal stack (required)

```bash
adb shell pm clear com.wai.mobile
adb logcat -c
adb logcat AndroidRuntime:E libc:F ReactNative:V ReactNativeJS:V Expo:V *:S
```

Then open the app and wait for the crash. Save the first `FATAL EXCEPTION` block.

## 2) Verify runtime events are arriving to Convex

The app sends runtime events to:

- `POST https://<deployment>.convex.site/mobile/runtime-event`

List latest events:

```bash
npx convex run mobileRuntimeEvents:listRecent '{"limit":50}'
```

Filter by fatal:

```bash
npx convex run mobileRuntimeEvents:listRecent '{"limit":50,"severity":"fatal"}'
```

## 3) Trigger a synthetic production error event

Option A (CLI mutation):

```bash
npx convex run mobileRuntimeEvents:triggerSyntheticError '{"eventName":"manual_production_trigger","severity":"error","message":"Manual synthetic runtime event","phase":"manual_trigger"}'
```

Option B (HTTP endpoint, token protected):

1. Set Convex env var:

- `MOBILE_RUNTIME_TRIGGER_TOKEN=<strong-random-token>`

2. Trigger event:

```bash
curl -X POST "https://<deployment>.convex.site/mobile/runtime-event/trigger" \
  -H "Authorization: Bearer <strong-random-token>" \
  -H "Content-Type: application/json" \
  -d '{"eventName":"manual_production_trigger","severity":"error","message":"Synthetic check from production","phase":"manual_trigger","platform":"android"}'
```

3. Re-check events with `mobileRuntimeEvents:listRecent`.

## 4) Production safety checks

- Keep `EXPO_PUBLIC_CONVEX_URL` as absolute `https://...convex.cloud`.
- Keep app on Hermes/default JS engine (do not force unsupported engine override).
- Use EAS preview APK to reproduce before production rollout.
