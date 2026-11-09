# JobPilot — Android app

Native Android app (Expo SDK 57 / React Native) for JobPilot. The backend and website live in **jobPilot-Website**.

- `mobile/`: the app (expo-router screens in `mobile/app`).
- `shared/api.ts`: every API type and endpoint, the same file as in jobPilot-Website. Change it there first, then copy it here; both apps must compile against it.

## Build
```
cd mobile
npm install --legacy-peer-deps
npx expo prebuild --platform android
cd android && .\gradlew.bat assembleRelease
```
APK: `mobile/android/app/build/outputs/apk/release/app-release.apk`. On a PC with 8 GB of RAM, close everything else first.

## Backend
The app uses the hosted JobPilot server (https://jobpilot-api-gpa6.onrender.com) by default; free hosting sleeps when idle, so the first request can take ~50 s. To use your own server instead, tap "Use my own server instead" on the sign-in screen and enter e.g. http://<PC Wi-Fi IP>:8080 (open TCP 8080 in the Windows firewall).
