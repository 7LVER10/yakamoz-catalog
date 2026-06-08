# 🎨 YAKAMOZ Design System

> Design rules for all AI agents and developers working on YAKAMOZ UI.
> **Never deviate from these rules without explicit approval from 7LVER10.**

---

## 🎯 Core Aesthetic

**Premium Dark Glassmorphism** — the YAKAMOZ visual identity is built on:
- Dark backgrounds with depth
- Glass-effect cards (backdrop blur + transparency)
- Metallic and luminous accents
- High contrast text on dark surfaces
- Subtle animated elements (glow, shimmer)

---

## 🎨 Color Palette

### Primary Colors
```css
--color-bg-primary:      #0a0e1a;   /* Deep midnight navy */
--color-bg-secondary:    #111827;   /* Dark slate */
--color-bg-card:         rgba(255, 255, 255, 0.05); /* Glass */
--color-border-glass:    rgba(255, 255, 255, 0.1);  /* Glass border */
```

### Accent Colors
```css
--color-accent-blue:     #3b82f6;   /* Electric blue */
--color-accent-cyan:     #06b6d4;   /* Cyan glow */
--color-accent-gold:     #f59e0b;   /* Gold premium */
--color-accent-purple:   #8b5cf6;   /* Purple accent */
```

### Text Colors
```css
--color-text-primary:    #f8fafc;   /* Pure white */
--color-text-secondary:  #94a3b8;   /* Muted slate */
--color-text-accent:     #60a5fa;   /* Blue link */
--color-text-gold:       #fbbf24;   /* Gold highlight */
```

### Gradient Presets
```css
/* Hero gradient */
background: linear-gradient(135deg, #0a0e1a 0%, #1e3a5f 50%, #0a0e1a 100%);

/* Card shimmer */
background: linear-gradient(135deg, rgba(59,130,246,0.1), rgba(139,92,246,0.1));

/* Gold accent */
background: linear-gradient(90deg, #f59e0b, #fbbf24);
```

---

## ✍️ Typography

### Font Stack
```css
/* Primary — Headlines */
font-family: 'Playfair Display', 'Georgia', serif;

/* Secondary — Body & UI */
font-family: 'Inter', 'Segoe UI', sans-serif;

/* Monospace — Code & Data */
font-family: 'JetBrains Mono', 'Fira Code', monospace;
```

### Type Scale
```css
--text-xs:    0.75rem;   /* 12px — labels */
--text-sm:    0.875rem;  /* 14px — body small */
--text-base:  1rem;      /* 16px — body */
--text-lg:    1.125rem;  /* 18px — subheading */
--text-xl:    1.25rem;   /* 20px — section title */
--text-2xl:   1.5rem;    /* 24px — card title */
--text-3xl:   1.875rem;  /* 30px — page title */
--text-4xl:   2.25rem;   /* 36px — hero title */
--text-5xl:   3rem;      /* 48px — display */
```

---

## 📱 Layout System

### Spacing Scale
```css
--space-1:  0.25rem;  /* 4px */
--space-2:  0.5rem;   /* 8px */
--space-3:  0.75rem;  /* 12px */
--space-4:  1rem;     /* 16px */
--space-6:  1.5rem;   /* 24px */
--space-8:  2rem;     /* 32px */
--space-12: 3rem;     /* 48px */
--space-16: 4rem;     /* 64px */
```

### Border Radius
```css
--radius-sm:  0.375rem;  /* 6px — buttons, badges */
--radius-md:  0.75rem;   /* 12px — cards */
--radius-lg:  1rem;      /* 16px — panels */
--radius-xl:  1.5rem;    /* 24px — modals */
--radius-full: 9999px;   /* pills */
```

### Glassmorphism Card
```css
.glass-card {
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
}
```

---

## 🌐 Multilingual Layout Rules

### Arabic (RTL) Support
```html
<!-- Always add dir attribute for Arabic -->
<html lang="ar" dir="rtl">

<!-- Or per-element -->
<div dir="rtl" class="content-ar">...</div>
```

```css
/* RTL-aware layout */
[dir="rtl"] .nav-menu { flex-direction: row-reverse; }
[dir="rtl"] .text-left { text-align: right; }
```

### Language Toggle Pattern
```javascript
const LANGUAGES = ['TR', 'EN', 'RU', 'AR'];
const RTL_LANGS = ['AR'];

function setLanguage(lang) {
  document.documentElement.lang = lang.toLowerCase();
  document.documentElement.dir = RTL_LANGS.includes(lang) ? 'rtl' : 'ltr';
}
```

---

## ✨ UI Components Cheat Sheet

### Product Card
- Glass card with product image (top)
- Title in Playfair Display
- Price in gold accent color
- CTA button in electric blue
- Hover: scale(1.02) + glow shadow

### Navigation
- Sticky header with backdrop blur
- Logo left, language switcher right
- Mobile: hamburger menu
- Active state: blue underline

### Hero Section
- Full-width dark gradient background
- Large display text (48px+)
- Subtitle in secondary color
- 2 CTA buttons: primary (blue) + secondary (outlined)

### Buttons
```css
/* Primary */
.btn-primary {
  background: #3b82f6;
  color: white;
  border-radius: 8px;
  padding: 12px 24px;
  font-weight: 600;
  transition: all 0.2s;
}
.btn-primary:hover { background: #2563eb; transform: translateY(-1px); }

/* Secondary (outlined) */
.btn-secondary {
  background: transparent;
  border: 1px solid rgba(255,255,255,0.3);
  color: white;
  border-radius: 8px;
  padding: 12px 24px;
}
```

---

## 🚧 What NOT to do

- No white/light backgrounds
- No flat design (Material Design alone is not enough)
- No low-contrast text
- No Comic Sans or system-default fonts
- No non-responsive layouts
- No ignoring RTL for Arabic
- No breaking the glass/dark aesthetic

---

*See also: [AGENTS.md](../AGENTS.md) | [Ecosystem](./yakamoz-ecosystem.md) | [AI Tooling](./ai-tooling/README.md)*
