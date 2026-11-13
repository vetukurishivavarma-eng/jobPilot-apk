const { withAndroidManifest } = require('expo/config-plugins')

// The backend runs on the user's PC over plain http on the LAN; release builds block cleartext by default.
const allowHttp = config => withAndroidManifest(config, c => {
  c.modResults.manifest.application[0].$['android:usesCleartextTraffic'] = 'true'
  return c
})

module.exports = {
  name: 'JobPilot',
  slug: 'jobpilot',
  version: '1.5.2',
  icon: './assets/icon.png',
  orientation: 'portrait',
  scheme: 'jobpilot',
  userInterfaceStyle: 'automatic',
  android: {
    package: 'com.jobpilot.app', versionCode: 20,
    permissions: ['CAMERA', 'RECORD_AUDIO', 'MODIFY_AUDIO_SETTINGS', 'POST_NOTIFICATIONS', 'REQUEST_INSTALL_PACKAGES'], // spoken live interview: camera, mic, 'recording ready'
    blockedPermissions: ['android.permission.SYSTEM_ALERT_WINDOW'],
    adaptiveIcon: { foregroundImage: './assets/adaptive-fg.png', backgroundImage: './assets/adaptive-bg.png' },
  },
  plugins: ['expo-router', 'expo-secure-store', 'expo-sharing', 'expo-web-browser', 'expo-status-bar', 'expo-notifications', allowHttp],
}
