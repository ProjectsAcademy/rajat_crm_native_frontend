import { Platform } from 'react-native';

// Web browser → localhost works directly
// Physical device (Android/iOS) → must be your PC's WiFi IP (run ipconfig, look for Wi-Fi IPv4)
// Android emulator only → use http://10.0.2.2:3000
const WIFI_IP = '192.168.1.13'; // ← replace with your Wi-Fi IPv4 address

export const API_BASE_URL =
  Platform.OS === 'web'
    ? 'http://localhost:3000'
    : `http://${WIFI_IP}:3000`;
