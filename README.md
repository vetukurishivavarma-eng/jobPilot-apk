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

## Connect to the backend
Same Wi-Fi as the PC that runs the backend. Open TCP port 8080 in the Windows firewall, then enter `http://<PC Wi-Fi IP>:8080` as the server address on the sign-in screen.
