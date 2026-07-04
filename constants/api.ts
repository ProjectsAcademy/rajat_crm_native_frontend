// Local dev:   set EXPO_PUBLIC_API_URL in .env.development (gitignored)
// EAS builds:  EXPO_PUBLIC_API_URL is set in eas.json env section
export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';
