const { withAndroidManifest } = require('expo/config-plugins')

// The backend runs on the user's PC over plain http on the LAN; release builds block cleartext by default.
const allowHttp = config => withAndroidManifest(config, c => {
  c.modResults.manifest.application[0].$['android:usesCleartextTraffic'] = 'true'
  return c
})

module.exports = {
  name: 'JobPilot',
  slug: 'jobpilot',
  version: '1.2.1',
  icon: './assets/icon.png',
  orientation: 'portrait',
  scheme: 'jobpilot',
  userInterfaceStyle: 'automatic',
  android: {
    package: 'com.jobpilot.app', versionCode: 8,
    permissions: ['CAMERA'], // eye-contact coach in the live interview
    blockedPermissions: ['android.permission.SYSTEM_ALERT_WINDOW'],
    adaptiveIcon: { foregroundImage: './assets/adaptive-fg.png', backgroundImage: './assets/adaptive-bg.png' },
  },
  plugins: ['expo-router', 'expo-secure-store', 'expo-sharing', 'expo-web-browser', 'expo-status-bar', allowHttp],
}
