// Dynamic Expo config — replaces the old static app.json.
//
// Produces two distinct installable Android/iOS apps from one codebase, so a
// Dev build and a Prod build can sit side by side on the same device without
// overwriting each other, and are clearly labeled so nobody confuses them:
//   - EAS Build sets process.env.EAS_BUILD_PROFILE to the --profile name
//     ("development" | "preview" | "production") during `eas build`.
//   - Locally (`expo start`, `expo run:android` without EAS), that var is
//     unset, so it falls back to the Dev identity — the right default for
//     a local dev client.
const IS_PROD = process.env.EAS_BUILD_PROFILE === 'production';

const APP_NAME = IS_PROD ? 'Rajat CRM' : '(Dev) Rajat CRM';
const PACKAGE_ID = IS_PROD ? 'com.rajatelectricals.crm' : 'com.rajatelectricals.crm.dev';
// Distinct adaptive-icon background so the two app icons are told apart at a
// glance on the home screen too, not just by name: navy (prod) vs copper (dev).
const ADAPTIVE_BG = IS_PROD ? '#232F3E' : '#B24C1F';
// Separate deep-link scheme so Android doesn't have to disambiguate which of
// two installed apps should handle a crm:// link.
const SCHEME = IS_PROD ? 'crm' : 'crm-dev';

module.exports = {
  expo: {
    name: APP_NAME,
    slug: 'crm-mobile',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'automatic',
    splash: {
      image: './assets/splash.png',
      resizeMode: 'contain',
      backgroundColor: ADAPTIVE_BG,
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: PACKAGE_ID,
    },
    android: {
      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon.png',
        backgroundColor: ADAPTIVE_BG,
      },
      package: PACKAGE_ID,
    },
    web: {
      bundler: 'metro',
      output: 'static',
      favicon: './assets/favicon.png',
    },
    plugins: ['expo-router', 'expo-secure-store'],
    experiments: {
      typedRoutes: true,
    },
    scheme: SCHEME,
    extra: {
      router: {},
      eas: {
        projectId: 'd1d74972-54df-4980-8239-46e8c0e31194',
      },
    },
  },
};
