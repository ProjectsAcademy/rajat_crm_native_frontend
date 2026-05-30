/**
 * Shared Stack screenOptions for all sub-module layouts.
 *
 * Problem solved:
 *   When a <Stack> is rendered inside a <Tabs> navigator that has
 *   headerShown: false, the Stack header does NOT automatically inset
 *   itself below the OS status bar on Android. This causes the header title
 *   to overlap the system status bar icons.
 *
 * Fix:
 *   Pass `headerStatusBarHeight` explicitly. On Android this equals
 *   StatusBar.currentHeight (the real status bar pixel height). On iOS
 *   the Stack header already handles safe-area insets natively, so 0 is correct.
 */
import { Platform, StatusBar } from 'react-native';
import { Colors } from './colors';

export const STACK_SCREEN_OPTIONS = {
  headerStyle:       { backgroundColor: Colors.primary },
  headerTintColor:   '#fff',
  headerTitleStyle:  { fontWeight: '700' as const, fontSize: 17 },
  headerBackTitle:   'Back',
  // ↓ This is the key fix — tells the Stack how tall the status bar is
  //   so it offsets the header content correctly.
  headerStatusBarHeight: Platform.OS === 'android'
    ? (StatusBar.currentHeight ?? 24)
    : 0,
} as const;
