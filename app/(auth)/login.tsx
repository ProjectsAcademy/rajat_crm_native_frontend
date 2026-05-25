import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useRef, useState } from 'react';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../store/auth';
import { Colors } from '../../constants/colors';

export default function LoginScreen() {
  const [username, setUsername]           = useState('');
  const [password, setPassword]           = useState('');
  const [showPassword, setShowPassword]   = useState(false);
  const [usernameFocused, setUsernameFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [error, setError]                 = useState('');

  const passwordRef = useRef<TextInput>(null);
  const { login, isLoading } = useAuthStore();

  const handleLogin = async () => {
    setError('');
    if (!username.trim() || !password.trim()) {
      setError('Please enter your username and password.');
      return;
    }
    try {
      await login(username.trim(), password);
      router.replace('/(app)');
    } catch (err: any) {
      const msg = err?.response?.data?.error || 'Login failed. Please try again.';
      setError(msg);
    }
  };

  return (
    // KAV only active on iOS — Android uses adjustResize via system so KAV would double-apply
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={0}
    >
      <View style={styles.inner}>
        {/* Logo */}
        <View style={styles.logoArea}>
          <View style={styles.logoBox}>
            <Ionicons name="flash" size={32} color={Colors.accent} />
          </View>
          <Text style={styles.brand}>Rajat Electricals</Text>
          <Text style={styles.brandSub}>CRM Management System</Text>
        </View>

        {/* Card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Sign in</Text>

          {error ? (
            <View style={styles.errorBox}>
              <Ionicons name="alert-circle-outline" size={15} color={Colors.error} />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          {/* Username */}
          <View style={styles.field}>
            <Text style={styles.label}>Username</Text>
            <TextInput
              style={[styles.input, usernameFocused && styles.inputFocused]}
              placeholder="Enter your username"
              placeholderTextColor={Colors.textMuted}
              value={username}
              onChangeText={setUsername}
              onFocus={() => setUsernameFocused(true)}
              onBlur={() => setUsernameFocused(false)}
              autoCapitalize="none"
              autoCorrect={false}
              textContentType="username"
              autoComplete="username"
              returnKeyType="next"
              onSubmitEditing={() => passwordRef.current?.focus()}
              blurOnSubmit={false}
            />
          </View>

          {/* Password — textContentType="none" prevents iOS from loading the
              Passwords autofill bar, which would change keyboard height mid-animation
              and cause focus to be dropped */}
          <View style={styles.field}>
            <Text style={styles.label}>Password</Text>
            <View 
              style={[styles.passwordRow, passwordFocused && styles.inputFocused]}
              collapsable={false}
            >
              <TextInput
                ref={passwordRef}
                style={styles.passwordInput}
                placeholder="Enter your password"
                placeholderTextColor={Colors.textMuted}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                onFocus={() => setPasswordFocused(true)}
                onBlur={() => setPasswordFocused(false)}
                textContentType="password"
                autoComplete="password"
                returnKeyType="done"
                onSubmitEditing={handleLogin}
              />
              <TouchableOpacity
                onPress={() => setShowPassword(p => !p)}
                style={styles.eyeBtn}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons
                  name={showPassword ? 'eye-outline' : 'eye-off-outline'}
                  size={18}
                  color={Colors.textMuted}
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Sign In */}
          <TouchableOpacity
            style={[styles.signInBtn, isLoading && styles.signInBtnDisabled]}
            onPress={handleLogin}
            disabled={isLoading}
            activeOpacity={0.85}
          >
            {isLoading ? (
              <ActivityIndicator color="#111" size="small" />
            ) : (
              <Text style={styles.signInText}>Sign in</Text>
            )}
          </TouchableOpacity>
        </View>

        <Text style={styles.footer}>© 2025 Rajat Electricals · v1.0 Phase 1</Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  inner: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingBottom: 40,
  },

  logoArea: { alignItems: 'center', marginBottom: 28 },
  logoBox: {
    width: 64, height: 64, borderRadius: 16,
    backgroundColor: Colors.primary,
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 14,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18, shadowRadius: 10, elevation: 6,
  },
  brand:    { fontSize: 22, fontWeight: '700', color: Colors.textPrimary, letterSpacing: 0.3 },
  brandSub: { fontSize: 13, color: Colors.textSecondary, marginTop: 4 },

  card: {
    backgroundColor: Colors.surface, borderRadius: 8,
    borderWidth: 1, borderColor: Colors.border, padding: 24,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07, shadowRadius: 8, elevation: 3,
  },
  cardTitle: { fontSize: 20, fontWeight: '700', color: Colors.textPrimary, marginBottom: 20 },

  errorBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    backgroundColor: Colors.errorLight, borderLeftWidth: 3,
    borderLeftColor: Colors.error, borderRadius: 4,
    padding: 12, marginBottom: 16,
  },
  errorText: { color: Colors.error, fontSize: 13, flex: 1, lineHeight: 18 },

  field: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '600', color: Colors.textPrimary, marginBottom: 6 },
  input: {
    height: 44, borderWidth: 1.5, borderColor: Colors.border, borderRadius: 4,
    paddingHorizontal: 12, fontSize: 14, color: Colors.textPrimary,
    backgroundColor: Colors.surface,
  },
  inputFocused: {
    borderColor: Colors.accent, borderWidth: 1.5,
    shadowColor: Colors.accent, shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.2, shadowRadius: 4, elevation: 2,
  },
  passwordRow: {
    flexDirection: 'row', alignItems: 'center', height: 44,
    borderWidth: 1.5, borderColor: Colors.border, borderRadius: 4,
    backgroundColor: Colors.surface, paddingHorizontal: 12,
  },
  passwordInput: { flex: 1, fontSize: 14, color: Colors.textPrimary },
  eyeBtn: { padding: 4 },

  signInBtn: {
    height: 44, backgroundColor: Colors.accent, borderRadius: 4,
    justifyContent: 'center', alignItems: 'center', marginTop: 8,
    shadowColor: Colors.accent, shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3, shadowRadius: 6, elevation: 4,
  },
  signInBtnDisabled: { opacity: 0.65 },
  signInText: { fontSize: 15, fontWeight: '700', color: '#111', letterSpacing: 0.2 },

  footer: { textAlign: 'center', color: Colors.textMuted, fontSize: 11, marginTop: 28 },
});
