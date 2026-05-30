# CLAUDE.md — Mobile Reference (`mobile/`)

> **Production CRM Mobile App** for Rajat Electricals.
> Stack: **Expo SDK 54 + React Native 0.81.5 + TypeScript + Expo Router (file-based routing) + Zustand (state) + Axios (HTTP)**.
> Targets: **Android** (primary), **iOS**, and **Web** (expo-web via react-native-web).

---



## 1. Project Bootstrap

| File | Purpose |
|---|---|
| `package.json` | `"main": "expo-router/entry"` — Expo Router is the entry point |
| `app.json` | Expo app config (name `Rajat CRM`, slug, Android package, EAS project ID) |
| `eas.json` | EAS Build profiles: `development`, `preview`, `production` |
| `babel.config.js` | Babel config for Expo; includes `expo-router/babel` plugin |
| `tsconfig.json` | TypeScript config extending `expo/tsconfig.base` |

### Scripts
```
npx expo start            # Start dev server
npx expo start --clear    # Start with cache cleared (use when changing deps/env)
npx expo run:android      # Local Android build
npx expo run:ios          # Local iOS build
npx expo start --web      # Web build (dev)
npx expo export --platform web  # Static web export
eas build --platform android --profile production  # EAS cloud build
```

---

## 2. Environment Variables

| Variable | Where Set | Description |
|---|---|---|
| `EXPO_PUBLIC_API_URL` | `.env.development` (local dev), `eas.json` env section (EAS builds) | Backend API base URL |

```typescript
// constants/api.ts — single source of truth
export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';
```

> ⚠️ All `EXPO_PUBLIC_*` variables are **inlined at build time** by Metro bundler — they are NOT runtime secrets. Never put JWT secrets or private keys in `EXPO_PUBLIC_*` vars.

---

## 3. File Structure

```
mobile/
├── app/                     ← Expo Router file-based routes
│   ├── _layout.tsx          ← Root layout (GestureHandler + StatusBar + auth init)
│   ├── index.tsx            ← Auth gate redirect (→ /(app) or /(auth)/login)
│   ├── (auth)/
│   │   ├── _layout.tsx      ← Simple Stack layout for auth screens
│   │   └── login.tsx        ← Login screen
│   └── (app)/
│       ├── _layout.tsx      ← Tab navigator (5 visible tabs + hidden stacks)
│       ├── index.tsx        ← Dashboard (Home tab)
│       ├── work.tsx         ← Work hub screen
│       ├── people.tsx       ← People hub screen
│       ├── finance.tsx      ← Finance hub screen
│       ├── customers/       ← index, [id], _layout
│       ├── tenders/         ← index, [id], _layout
│       ├── projects/        ← index, [id], _layout
│       ├── vendors/         ← index, [id], _layout
│       ├── employees/       ← index, [id], _layout
│       ├── orders/          ← index, [id], _layout
│       ├── invoices/        ← index, [id], _layout
│       ├── purchases/       ← index, [id], _layout
│       ├── estimates/       ← index, [id], _layout
│       ├── gst/             ← index, [id], _layout
│       ├── inventory/       ← index, [id], stock.tsx, _layout
│       ├── hr/              ← index, attendance, salary-components, salary-payments, incentives, epf-esic, _layout
│       ├── vehicles/        ← index, [id], _layout
│       ├── maintenance/     ← index, _layout
│       └── (no vendors detail yet — see vendors/[id].tsx)
├── components/
│   ├── OrderFormSheet.tsx   ← Full CRUD form for orders (modal)
│   ├── PaymentFormSheet.tsx ← Payment entry modal
│   ├── MediaSection.tsx     ← Reusable file attachment component
│   ├── CameraUploadSheet.tsx← Camera/gallery upload bottom sheet
│   └── ui/                 ← (reserved, currently empty)
├── services/
│   └── api.ts              ← Axios instance + all API functions + TypeScript types
├── store/
│   └── auth.ts             ← Zustand auth store
├── hooks/
│   └── useMediaUpload.ts   ← Generic file upload hook
├── constants/
│   ├── api.ts              ← API_BASE_URL
│   └── colors.ts           ← Design system color tokens
└── utils/
    └── storage.ts          ← Cross-platform secure storage abstraction
```

---

## 4. Routing Architecture (Expo Router)

### Root Layout — `app/_layout.tsx`
```tsx
// Wraps everything in GestureHandlerRootView (required for gesture-handler)
// Calls useAuthStore.initialize() on mount to restore session from storage
// StatusBar style="light" (white text for dark header)
// Stack with headerShown: false (all headers managed per-screen)
```

### Auth Gate — `app/index.tsx`
```tsx
// Waits for isInitialized (auth store hydration complete)
// Shows ActivityIndicator on Colors.primary background while loading
// user ? Redirect to /(app) : Redirect to /(auth)/login
```

### Tab Navigator — `app/(app)/_layout.tsx`
5 visible tabs:
| Tab | Screen | Icon |
|---|---|---|
| Home | `(app)/index` | `grid-outline` |
| Work | `(app)/work` | `briefcase-outline` |
| People | `(app)/people` | `people-outline` |
| Inventory | `(app)/inventory` (tab stack entry) | `cube-outline` |
| Finance | `(app)/finance` | `wallet-outline` |

All other module screens (`tenders`, `projects`, `customers`, `vendors`, `employees`, `orders`, `invoices`, `purchases`, `estimates`, `gst`, `hr`, `vehicles`, `maintenance`) are declared with `href: null` — **they are navigable but NOT visible in the tab bar**.

Tab bar styling:
- Background: `Colors.surface` (#FFFFFF)
- Active tint: `Colors.accent` (#FF9900)
- Height: 80px with 20px bottom padding (safe area aware)
- Header: `Colors.primary` (#232F3E), white text/tint

### Hub Screens
The Work, People, and Finance tabs are **hub screens** — they display a grid of cards linking into the module stacks:
- `work.tsx` → Tenders, Projects, Orders, Estimates, Maintenance
- `people.tsx` → Customers, Vendors, Employees
- `finance.tsx` → Invoices, Purchases, GST, HR, Stock

### Module Stack Pattern
Each module follows: `_layout.tsx` (stack config) → `index.tsx` (list) → `[id].tsx` (detail)

---

## 5. State Management

### `store/auth.ts` — Zustand Auth Store

```typescript
interface AuthState {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  isInitialized: boolean;  // true after initialize() completes
  login(username, password): Promise<void>;
  logout(): Promise<void>;
  initialize(): Promise<void>;  // called once in root _layout.tsx
}
```

#### `initialize()` flow:
1. Read `auth_token` from `storage`
2. If token exists → call `authApi.me()` to validate
3. On success → set `user + token + isInitialized: true`
4. On failure (expired/invalid token) → delete from storage, set `user: null, isInitialized: true`
5. If no token → set `isInitialized: true` immediately

#### `login()` flow:
1. Set `isLoading: true`
2. Call `authApi.login(username, password)`
3. Save `token` to storage with `storage.set('auth_token', token)`
4. Set `user + token`, clear `isLoading`
5. On error → clear `isLoading`, re-throw (caller shows error message)

#### `logout()` flow:
1. Call `authApi.logout()` (fire-and-forget, ignore errors — stateless JWT)
2. Delete `auth_token` from storage
3. Set `user: null, token: null`

---

## 6. Secure Storage — `utils/storage.ts`

Cross-platform storage abstraction:
```typescript
// Web:    localStorage  (plain string)
// Native: expo-secure-store  (encrypted keychain/keystore)

storage.get(key)      → Promise<string | null>
storage.set(key, val) → Promise<void>
storage.delete(key)   → Promise<void>
```

Key used: `auth_token` — stores the raw JWT string.

> ⚠️ `expo-secure-store` has a 2048-byte value limit on some platforms. JWTs are typically well under this limit but be aware if expanding token payload.

---

## 7. HTTP Client — `services/api.ts`

### Axios Instance
```typescript
export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});
```

### Request Interceptor
Automatically attaches `Authorization: Bearer <token>` header to every request by reading from storage:
```typescript
api.interceptors.request.use(async (config) => {
  const token = await storage.get('auth_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
```

### Response Interceptor
Passes through successful responses unchanged. 401 errors are **not** globally intercepted — they propagate to the caller. The auth store's `initialize()` handles token expiry at app start.

### API Functions
All API functions are grouped by domain and fully typed:

| Export | Backend Route | Methods |
|---|---|---|
| `authApi` | `/api/auth` | login, me, logout |
| `dashboardApi` | `/api/dashboard` | getSummary |
| `customersApi` | `/api/customers` | list, detail |
| `tendersApi` | `/api/tenders` | list, detail |
| `inventoryApi` | `/api/inventory` | list, detail |
| `vendorsApi` | `/api/vendors` | list, detail |
| `employeesApi` | `/api/employees` | list, detail |
| `projectsApi` | `/api/projects` | list, detail |
| `ordersApi` | `/api/orders` | list, detail, create, update, remove, addPayment, updatePayment |
| `invoicesApi` | `/api/invoices` | list, detail |
| `purchasesApi` | `/api/purchases` | list, detail |
| `estimatesApi` | `/api/estimates` | list, detail |
| `stockApi` | `/api/stock` | list |
| `gstApi` | `/api/gst` | list, detail |
| `hrApi` | `/api/hr` | attendance.list/detail, salaryComponents.list, salaryPayments.list/detail, incentives.list, epfEsic.list/detail |
| `vehiclesApi` | `/api/vehicles` | list, detail |
| `maintenanceApi` | `/api/maintenance` | list, fdAlerts |

All TypeScript interfaces for request/response shapes are defined at the bottom of `services/api.ts`.

---

## 8. Design System — `constants/colors.ts`

AWS-inspired color palette (dark navy + Amazon orange):

```typescript
Colors.primary      = '#232F3E'  // AWS dark header — used for all headers/navbars
Colors.primaryLight = '#37475A'  // Lighter nav variant
Colors.accent       = '#FF9900'  // Amazon orange — primary action/CTA color
Colors.accentDark   = '#E88B00'
Colors.accentLight  = '#FFF8E7'  // Light orange background for accent elements

Colors.background   = '#F2F3F3'  // Page background (light grey)
Colors.surface      = '#FFFFFF'  // Card/input background
Colors.surfaceAlt   = '#FAFAFA'

Colors.textPrimary   = '#0F1111'
Colors.textSecondary = '#565959'
Colors.textMuted     = '#8D9397'
Colors.textInverse   = '#FFFFFF'  // Text on dark backgrounds

Colors.border        = '#D5D9D9'
Colors.borderFocus   = '#FF9900'  // Focus ring color (same as accent)

Colors.success = '#067D62'  Colors.successLight = '#E3F5F0'
Colors.warning = '#FF9900'  Colors.warningLight = '#FFF8E7'
Colors.error   = '#D13212'  Colors.errorLight   = '#FDEDE8'
Colors.info    = '#0073BB'  Colors.infoLight    = '#D3EEF9'

// KPI card icon colors (6 rotating colors for dashboard grid)
Colors.kpi1 = '#0073BB'  (AWS Blue)
Colors.kpi2 = '#067D62'  (AWS Green)
Colors.kpi3 = '#FF9900'  (Amazon Orange)
Colors.kpi4 = '#7B61FF'  (Purple)
Colors.kpi5 = '#D13212'  (AWS Red)
Colors.kpi6 = '#00A0B0'  (Teal)
```

---

## 9. Media Upload System

### `hooks/useMediaUpload.ts`

Generic hook for uploading files to `POST /api/media/upload`:

```typescript
const { upload, uploading, progress, error, clearError } =
  useMediaUpload('order', orderId);

// Single file:
await upload({ uri, name, mimeType });

// Batch:
await upload([{ uri, name, mimeType }, ...]);
// Returns true if ALL succeeded, false if any failed
```

#### Client-side compression (before upload):
- Images (jpeg/png/gif/webp/bmp) are compressed via **expo-image-manipulator**:
  - Resize to max 1920px wide
  - JPEG format, 80% quality
  - Extension renamed to `.jpg`
- PDFs and Office docs are uploaded as-is (already compressed internally)
- If compression fails → fallback to uploading original

#### XHR vs Axios (critical decision):
```typescript
// We use XHR directly instead of axios for multipart uploads.
// Reason: axios sets Content-Type: application/json in its default headers,
// which causes express.json() to consume the request body BEFORE multer
// can read the multipart form data. XHR lets the native layer set the
// correct multipart boundary automatically.
const xhr = new XMLHttpRequest();
xhr.open('POST', `${API_BASE_URL}/api/media/upload`);
if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
xhr.timeout = 60_000;  // 60s timeout for large files
```

#### Web vs Native FormData:
```typescript
if (Platform.OS === 'web') {
  // Browser needs a real Blob
  const blob = await fetch(input.uri).then(r => r.blob());
  fd.append('file', blob, input.name);
} else {
  // React Native accepts { uri, name, type } object
  fd.append('file', { uri, name, type: mimeType } as any);
}
```

#### Allowed MIME types (synced with backend):
```
image/jpeg, image/png, image/gif, image/webp, image/heic, image/heif, image/bmp
application/pdf
application/msword, .../wordprocessingml.document  (Word)
application/vnd.ms-excel, .../spreadsheetml.sheet   (Excel)
application/vnd.ms-powerpoint, .../presentationml.presentation (PPT)
```

### `components/MediaSection.tsx`

Reusable attachment UI component. Drop it into any detail screen.

```tsx
<MediaSection
  entity="order"        // 'tender' | 'order' | 'invoice' | 'inventory'
  entityId={order.id}
  files={order.mediaFiles}
  onRefresh={reloadOrder}
/>
```

Features:
- **Upload**:
  - Web → `expo-document-picker` (multi-select) → `useMediaUpload`
  - Mobile → Opens `CameraUploadSheet` (camera or gallery)
- **Auto-thumbnails**: Calls `GET /api/media/presign/{entity}/{id}` for each image file to get signed URL for display
- **Preview**: Full-screen image viewer modal (non-image files open via `expo-linking`)
- **Delete**: Single delete (confirm dialog) or bulk select-and-delete
- **File type icons**: PDF = red, image = blue, Word = dark blue, Excel = green

### `components/CameraUploadSheet.tsx`

Bottom sheet (mobile-only) for capturing/uploading media:
- Camera capture via `expo-image-picker`
- Gallery selection via `expo-image-picker`
- Document picker (PDFs/docs) via `expo-document-picker`
- Internally uses `useMediaUpload` hook

---

## 10. Key Screens

### Dashboard — `app/(app)/index.tsx`

- Fetches `GET /api/dashboard` on mount via `dashboardApi.getSummary()`
- Pull-to-refresh support via `RefreshControl`
- KPI grid: 2 columns on mobile, 3 columns on web (`Platform.OS === 'web' ? 3 : 2`)
- Each KPI card checks `migratedPhase >= item.phase` to show count vs `—` placeholder
- KPI cards navigate to their respective module stacks on press
- Logout button triggers `useAuthStore.logout()` then redirects to login

### Login — `app/(auth)/login.tsx`

Key implementation details:
```
- KeyboardAvoidingView: behavior='padding' on iOS only; Android uses 'adjustResize' system — double-applying KAV would cause issues
- Username field: textContentType="username", autoComplete="username"
- Password field: textContentType="password", autoComplete="password"
- Password field uses outlineStyle: 'none' (web) to remove browser default focus ring
- passwordRef allows username 'next' key to focus password field
- outlineStyle: 'none' applied in Platform.select({ web: { outlineStyle: 'none' } })
- Login success: router.replace('/(app)') — replaces history so Back doesn't return to login
```

### Order Form — `components/OrderFormSheet.tsx`

Full CRUD modal (create + edit) for orders. Most complex component in the app.

Key features:
- **Dual layout**: Separate web (dialog with table) and mobile (full-screen modal with cards) layouts
- **SearchPickerModal**: Reusable inner modal for selecting Customer, Project, or Inventory item
  - TextInput has `autoComplete="new-password"` and `textContentType="none"` to prevent iOS autofill UI from appearing in search fields
- **Inventory picker**: Loads inventory list lazily (only when picker opened), caches it
- **Stock validation**: If selected inventory has stock data, prevents qty > available stock
- **Date auto-formatting**: User types digits, auto-inserts slashes → `DD/MM/YYYY`
- **Date conversion**: `displayToIso` converts `DD/MM/YYYY` → `YYYY-MM-DD` for API
- **Grand total**: Computed client-side as `sum(qty × unitPrice)` per item row
- **Rental flag**: Toggle per item (`isRental: boolean`)
- On create → `ordersApi.create()` → `onSaved(newOrderId)` (caller can navigate to detail)
- On edit → `ordersApi.update()` → `onSaved()` (no id needed)

---

## 11. Cross-Platform Styling Rules

### Shadows
**Never** use deprecated top-level shadow props on non-iOS/Android. Always use `Platform.select`:
```typescript
...Platform.select({
  web: { boxShadow: '0 2px 8px rgba(0,0,0,0.07)' },
  default: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 3,  // Android
  },
}),
```

### TextInput Outline (Web)
All `TextInput` on web must suppress the browser default focus outline:
```typescript
...Platform.select({
  web: { outlineStyle: 'none' },
}),
```

### TextInput Autofill (Non-Auth Contexts)
For search fields and non-auth form inputs, suppress iOS autofill:
```tsx
<TextInput
  autoComplete="new-password"
  textContentType="none"
  importantForAutofill="no"
/>
```
This prevents the iOS Passwords bar from appearing and changing keyboard height unexpectedly.

### Auth Login Inputs (Exception)
Login screen uses correct autofill attributes:
- Username: `textContentType="username"`, `autoComplete="username"`
- Password: `textContentType="password"`, `autoComplete="password"`

---

## 12. Module Screen Patterns

### List Screen (`index.tsx`) Pattern
```
1. useState: data[], loading, refreshing, error, search string
2. useEffect → fetch on mount
3. Pull-to-refresh via RefreshControl
4. FlatList or ScrollView with search filtering
5. Item tap → router.push('/(app)/module/id')
6. useSafeAreaInsets() for top padding in custom headers
```

### Detail Screen (`[id].tsx`) Pattern
```
1. const { id } = useLocalSearchParams();
2. useEffect → fetch detail on mount
3. Loading skeleton / ActivityIndicator
4. Display sections: header info, financial summary, items list
5. MediaSection component for attachments (if entity supports media)
6. OrderFormSheet / PaymentFormSheet launched from action buttons
```

### HR Module — `app/(app)/hr/`
Unique: HR has its own internal tab navigator (secondary tabs within the HR stack):
- `index.tsx` — HR overview hub
- `attendance.tsx` — `hrApi.attendance.list()`
- `salary-components.tsx` — `hrApi.salaryComponents.list()`
- `salary-payments.tsx` — `hrApi.salaryPayments.list()`
- `incentives.tsx` — `hrApi.incentives.list()`
- `epf-esic.tsx` — `hrApi.epfEsic.list()`

### Inventory Module — `app/(app)/inventory/`
Has an extra `stock.tsx` screen (beyond standard index/[id]):
- `stock.tsx` — `stockApi.list()` — stock movement ledger with in/out/adjustment filter

---

## 13. Navigation Patterns

```typescript
// Navigate to list (push onto stack)
router.push('/(app)/orders');

// Navigate to detail
router.push(`/(app)/orders/${id}` as any);

// Replace current screen (no back history)
router.replace('/(app)');         // after login
router.replace('/(auth)/login');  // after logout

// Go back
router.back();
```

Note: All route paths that include dynamic segments need `as any` cast due to TypeScript strict route typing from expo-router.

---

## 14. Dependency Reference

| Package | Version | Role |
|---|---|---|
| `expo` | ~54.0.34 | Core Expo SDK |
| `expo-router` | ~6.0.23 | File-based navigation |
| `react-native` | 0.81.5 | Core framework |
| `react` | 19.1.0 | React |
| `zustand` | ^5.0.2 | Global state management |
| `axios` | ^1.7.9 | HTTP client |
| `expo-secure-store` | ~15.0.8 | Encrypted token storage (native) |
| `expo-image-manipulator` | ~14.0.8 | Client-side image compression before upload |
| `expo-image-picker` | ~17.0.11 | Camera and gallery access |
| `expo-document-picker` | ~14.0.8 | File system document picker |
| `expo-linking` | ~8.0.12 | Open URLs (for non-image file preview) |
| `@expo/vector-icons` | ^15.1.1 | Ionicons icon set |
| `react-native-gesture-handler` | ~2.28.0 | Gesture support (required for Expo Router) |
| `react-native-safe-area-context` | 5.6.2 | Safe area insets for notch/status bar |
| `react-native-screens` | ~4.16.0 | Native screen containers |
| `react-native-reanimated` | ~4.1.7 | Animations |
| `react-native-web` | ~0.21.2 | Web rendering target |
| `@react-native-async-storage/async-storage` | 2.2.0 | Required by some deps |

---

## 15. Critical Rules & Gotchas

### Auth Token Key
Token is stored under key `"auth_token"` in `storage`. This key is referenced in three places:
1. `store/auth.ts` — login (write), initialize (read), logout (delete)
2. `services/api.ts` — request interceptor (read)
3. `hooks/useMediaUpload.ts` — XHR upload (read)

**Never rename this key** without updating all three locations.

### Media Upload: Always Use XHR, Never Axios
Using `axios` for multipart upload breaks the server-side multer middleware because axios injects a JSON `Content-Type` header before multer can process the body. Always use the raw `XMLHttpRequest` pattern in `useMediaUpload.ts`.

### Web Platform has Different Layout
`OrderFormSheet.tsx` has two completely separate JSX trees — one for web (dialog with data table), one for mobile (full-screen modal with card rows). When modifying order form UI, check BOTH layouts.

### KAV on Android
Do NOT use `KeyboardAvoidingView` with `behavior` set on Android. Android handles keyboard avoidance via the `windowSoftInputMode="adjustResize"` manifest setting. Using KAV on Android causes double-adjustment and breaks the layout.

### Expo Router and Dynamic Routes
Dynamic route files named `[id].tsx` receive `id` as a string via `useLocalSearchParams()`. Always `parseInt(id)` before passing to API functions.

### StatusBar
`StatusBar style="light"` is set globally in root `_layout.tsx`. All screens automatically get white status bar text over the dark navbar.

### Date Format
The backend accepts ISO dates (`YYYY-MM-DD`). The `OrderFormSheet` converts user input (`DD/MM/YYYY`) using `displayToIso()`. Always use this helper when sending dates to the API.

### `isInitialized` Guard
The root `app/index.tsx` shows a spinner until `isInitialized === true`. This prevents a flash of the login screen before the token is validated. Never remove this guard.

# AI Engineering Rules for This Project

These rules are mandatory for all code modifications.

---

# 16. Root Cause Analysis First

Before implementing ANY UI or platform fix:

MANDATORY PROCESS:

1. Inspect actual rendered DOM/native hierarchy
2. Inspect computed CSS/styles
3. Identify exact element causing the issue
4. Explain WHY the issue occurs
5. Implement the smallest possible fix

DO NOT:

* patch blindly
* stack random styles
* add unnecessary wrappers
* refactor unrelated components
* rewrite shared systems without evidence

Prefer surgical fixes over architectural rewrites.

---

# 17. React Native Web Input Rules

React Native Web TextInput renders native HTML `<input>` elements on web.

Known Issue:
Browser `:focus-visible` outlines can create sharp rectangular inner borders inside rounded React Native containers.

Rule:
For NON-AUTH TextInput components on web:

```js
outlineStyle: 'none'
```

Focus indication must instead come from:

* parent border color
* parent shadow
* parent glow
* explicit focus state styling

DO NOT:

* add fake background fixes
* add nested wrappers
* globally inject CSS hacks

Before fixing TextInput rendering:

* inspect browser UA styles
* inspect RNW generated DOM
* inspect computed CSS

---

# 18. Autofill & Password Manager Rules

Browsers aggressively classify inputs as auth fields.

NEVER globally disable autofill.

Autofill SHOULD remain enabled for:

* login forms
* signup forms
* password fields
* email authentication

Autofill SHOULD be disabled for:

* search bars
* filters
* OTP inputs
* utility inputs
* settings search fields

For NON-AUTH inputs use:

```js
autoComplete="off"
textContentType="none"
importantForAutofill="no"
```

For web search/filter inputs prefer:

```js
autoComplete="new-password"
```

because browsers often ignore `"off"`.

Before changing autofill behavior:

1. inspect generated HTML attributes
2. inspect browser heuristics
3. determine whether browser is classifying the field as authentication-related

DO NOT:

* globally disable autofill
* break password manager support

---

# 19. React Native Web Styling Rules

Avoid deprecated RN Web shadow props on web:

Deprecated:

* shadowColor
* shadowOffset
* shadowOpacity
* shadowRadius

Prefer:

```js
boxShadow
```

When fixing web visual issues:

* inspect computed CSS first
* inspect RNW atomic CSS output
* identify whether issue comes from:

  * browser UA stylesheet
  * RNW generated styles
  * shared component styles
  * platform-specific code
  * external CSS

---

# 20. Minimal Modification Policy

Rules:

* modify only affected files
* preserve architecture
* avoid broad refactors
* avoid rewriting reusable components unless absolutely necessary
* avoid introducing abstraction layers without need

Every fix must answer:

1. Why did the issue happen?
2. Why is this the minimal safe fix?
3. Why will this not regress native/mobile behavior?

---

# 21. Cross Platform Safety

Every UI/style change must explicitly verify:

* iOS behavior
* Android behavior
* Web behavior

Never assume web fixes are safe for native.

Use:

```js
Platform.OS === 'web'
```

only when truly necessary.

Prefer shared compatible styles first.

---

# 22. Debugging Standards

When debugging:

* identify exact source file
* identify exact rendered element
* identify exact computed style/property
* explain rendering chain step-by-step

DO NOT provide speculative fixes.

Evidence-first debugging only.

---

# 23. Code Quality Rules

DO:

* keep fixes localized
* preserve readability
* preserve existing design system
* maintain predictable behavior

DO NOT:

* introduce hidden side effects
* duplicate logic
* create workaround chains
* suppress warnings without understanding them

Warnings must be investigated before suppression.

---

# 24. Authentication UX Protection

Never accidentally break:

* password managers
* autofill
* keyboard navigation
* accessibility focus visibility

If disabling browser focus outlines:

* ensure visible replacement focus state exists.

---

# 25. Final Response Format

Before implementing changes, always provide:

1. Root cause
2. Exact affected files
3. Minimal safe fix strategy
4. Regression risk analysis

Implementation comes AFTER analysis.

# Dropdown / Select Architecture Rules

## React Native Web Dropdown Policy

Native browser select elements MUST NOT be used for production UI that requires:

* dark mode support
* light mode support
* custom styling
* design system consistency
* visual parity with mobile
* cross-platform behavior

Reason:

On React Native Web, native browser select dropdown popups are rendered by the browser/OS UI layer and are not fully controlled by React, RN Web, CSS, theme providers, or design tokens.

The opened dropdown popup may ignore:

* theme colors
* background colors
* spacing
* border radius
* typography
* hover styles
* selected state styling

As a result, browser-native select elements cannot guarantee visual parity across:

* iOS
* Android
* Web

---

## Required Implementation

For application dropdowns use a fully controlled custom component:

Trigger:

* Pressable
* TouchableOpacity

Popup:

* Modal
* Portal
* Popover
* Bottom Sheet

Options:

* FlatList
* ScrollView
* Pressable rows

All visual states must come from shared theme tokens.

---

## Verification Requirements

A dropdown implementation is NOT considered complete until all states are verified:

Closed state
Open state
Selected state
Hover state (Web)
Keyboard navigation (Web)
Light mode
Dark mode
iOS
Android
React Native Web

---

## Debugging Rule

When dropdown styling issues occur:

DO NOT:

* patch colors blindly
* add zIndex fixes
* add wrapper layers
* modify random theme tokens

FIRST determine:

1. Is the dropdown native or custom?
2. Is the popup rendered inside React?
3. Is the popup rendered by browser/OS?
4. Can the popup be styled through theme tokens?

Only then implement a fix.
