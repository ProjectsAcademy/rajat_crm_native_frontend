import { Platform } from 'react-native';

// ─── API Base URL Configuration ───────────────────────────────────────────────
//
// For WEB (Netlify deployment):
//   Set EXPO_PUBLIC_API_URL in your Netlify dashboard:
//   Site → Site configuration → Environment variables
//   e.g. EXPO_PUBLIC_API_URL = https://api.yourvps.com
//   This value is baked into the bundle at build time.
//
// For LOCAL DEV (web):
//   Create a .env.local file in the project root:
//   EXPO_PUBLIC_API_URL=http://localhost:3000
//
// For LOCAL DEV (physical device / Android emulator):
//   Update WIFI_IP below with your machine's WiFi IP (run: ipconfig)
//   Android emulator: use http://10.0.2.2:3000
// ─────────────────────────────────────────────────────────────────────────────

const WIFI_IP = '192.168.1.5'; // ← update for local device testing

export const API_BASE_URL =
  Platform.OS === 'web'
    ? (process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000')
    : `http://${WIFI_IP}:3000`;
