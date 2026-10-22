# Frontend UI Engineering Rules

> Preserved verbatim from the original `CLAUDE.md` (written by the owner).
> These rules are mandatory for all frontend code changes. Section numbers are
> kept from the original document.

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
