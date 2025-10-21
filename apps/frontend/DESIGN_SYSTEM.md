# Flotilla Design System

**Version**: 1.0.0
**Last Updated**: 2025-10-21
**Design References**: GitLab Pajamas • Vercel Geist • GitHub Primer

---

## 🎨 Design Philosophy

### Core Principles

**"简洁优雅，一致流畅"** - Simple, Elegant, Consistent, Smooth

1. **Information Density** (GitLab Pajamas): Maximize useful information without overwhelming users
2. **Minimal Aesthetics** (Vercel Geist): Clean, modern design with subtle details
3. **Efficiency First** (GitHub Primer): Fast, intuitive interactions for developer workflows

### Technical Foundation

- **Tailwind CSS 4**: CSS-based configuration via `@theme` directive
- **Shadcn/ui + Radix UI**: Accessible, unstyled component primitives (80% usage)
- **Mantine 7.15**: Enterprise-grade advanced components (20% usage)
- **Geist Font Family**: Sans (UI) + Mono (Code)
- **next-themes**: Light/Dark mode management

---

## 🎨 Color System

### Primary Brand Color

**Blue (#3b82f6)** - Trust, professionalism, technology

```tsx
// Usage in components
className="bg-primary-500 text-white"
className="hover:bg-primary-600"
className="border-primary-500"
```

**Full Palette**:
- `primary-50` to `primary-950` (11 shades)
- Primary (500): `#3b82f6`
- Use lighter shades (100-300) for backgrounds
- Use darker shades (600-900) for emphasis

### Semantic Colors

```tsx
// Success (Green)
--color-success: #10b981;        // Light mode
--color-success-dark: #34d399;   // Dark mode
// Use for: Success messages, completed states, positive indicators

// Warning (Amber)
--color-warning: #f59e0b;        // Light mode
--color-warning-dark: #fbbf24;   // Dark mode
// Use for: Warnings, attention needed, caution states

// Danger (Red)
--color-danger: #ef4444;         // Light mode
--color-danger-dark: #f87171;    // Dark mode
// Use for: Errors, delete actions, critical alerts

// Info (Blue)
--color-info: #3b82f6;           // Light mode
--color-info-dark: #60a5fa;      // Dark mode
// Use for: Information, help text, general notifications
```

**Usage Examples**:

```tsx
// Success button
<Button className="bg-success hover:bg-success-dark text-white">
  Success
</Button>

// Warning badge
<Badge className="bg-warning text-white">
  Warning
</Badge>

// Danger alert
<Alert className="border-danger text-danger">
  Error occurred
</Alert>
```

### Neutral Color System

**Light Mode**:
```css
--background: #ffffff;           /* Main background */
--foreground: #111827;           /* Main text (gray-900) */
--muted: #f9fafb;                /* Secondary background (gray-50) */
--muted-foreground: #6b7280;     /* Secondary text (gray-500) */
--border: #e5e7eb;               /* Border color (gray-200) */
```

**Dark Mode**:
```css
--background: #18181b;           /* Main background (zinc-900) */
--foreground: #fafafa;           /* Main text (zinc-50) */
--muted: #27272a;                /* Secondary background (zinc-800) */
--muted-foreground: #a1a1aa;     /* Secondary text (zinc-400) */
--border: #3f3f46;               /* Border color (zinc-700) */
```

**Text Color Usage**:

```tsx
// Primary text (highest contrast)
className="text-gray-900 dark:text-gray-50"

// Secondary text (medium contrast)
className="text-gray-600 dark:text-gray-400"

// Tertiary text (low contrast, disabled states)
className="text-gray-500 dark:text-gray-500"

// Placeholder text
className="text-gray-400 dark:text-gray-600"
```

---

## 📐 Spacing System

**Base Unit**: 4px grid

```css
/* Design System Spacing Tokens */
--spacing-1: 0.25rem;   /* 4px  */
--spacing-2: 0.5rem;    /* 8px  */
--spacing-3: 0.75rem;   /* 12px */
--spacing-4: 1rem;      /* 16px */
--spacing-6: 1.5rem;    /* 24px */
--spacing-8: 2rem;      /* 32px */
--spacing-10: 2.5rem;   /* 40px */
--spacing-12: 3rem;     /* 48px */
--spacing-16: 4rem;     /* 64px */
--spacing-20: 5rem;     /* 80px */
```

**Usage Guidelines**:

| Use Case | Spacing | Tailwind Class |
|----------|---------|----------------|
| Component padding (small) | 12px | `p-3` |
| Component padding (default) | 16px | `p-4` |
| Component padding (large) | 24px | `p-6` |
| Section spacing | 32px | `space-y-8` |
| Page section gaps | 48px | `space-y-12` |
| Hero/Feature gaps | 64px | `space-y-16` |

---

## 🔤 Typography System

### Font Families

```css
/* Sans-serif (UI) */
--font-sans: var(--font-geist-sans), -apple-system, BlinkMacSystemFont,
             "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;

/* Monospace (Code) */
--font-mono: var(--font-geist-mono), ui-monospace, SFMono-Regular,
             Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
```

### Font Sizes & Line Heights

| Size | Font Size | Line Height | Use Case |
|------|-----------|-------------|----------|
| `text-xs` | 12px | 16px | Small labels, badges |
| `text-sm` | 14px | 20px | Secondary text, form labels |
| `text-base` | 16px | 24px | Body text (default) |
| `text-lg` | 18px | 28px | Emphasized text |
| `text-xl` | 20px | 28px | Subheadings |
| `text-2xl` | 24px | 32px | Card titles |
| `text-3xl` | 30px | 36px | Page section titles |
| `text-4xl` | 36px | 40px | Page titles |

### Font Weights

```tsx
// Normal (400) - Default body text
className="font-normal"

// Medium (500) - Labels, navigation items
className="font-medium"

// Semibold (600) - Headings, emphasis
className="font-semibold"

// Bold (700) - Strong emphasis, CTAs
className="font-bold"
```

### Typography Examples

```tsx
// Page Title
<h1 className="text-4xl font-bold text-gray-900 dark:text-gray-50 mb-4">
  Page Title
</h1>

// Section Title
<h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-50 mb-6">
  Section Title
</h2>

// Card Title
<h3 className="text-xl font-semibold text-gray-900 dark:text-gray-50">
  Card Title
</h3>

// Body Text
<p className="text-base text-gray-600 dark:text-gray-400">
  Body text content goes here.
</p>

// Small Text
<span className="text-sm text-gray-500 dark:text-gray-500">
  Metadata or secondary information
</span>
```

---

## 🎯 Component Guidelines

### When to Use Shadcn/ui

✅ **Use Shadcn/ui for**:
- Basic UI components (Button, Input, Card, Dialog, Dropdown, etc.)
- Need full control over styling with Tailwind classes
- Lightweight components without complex logic
- Custom component variations
- Forms with simple validation

**Example**:
```tsx
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

<Card className="hover:shadow-elegant-lg transition-all duration-200">
  <CardHeader>
    <CardTitle>Project Statistics</CardTitle>
  </CardHeader>
  <CardContent>
    <Button variant="default" size="lg">
      View Details
    </Button>
  </CardContent>
</Card>
```

### When to Use Mantine

✅ **Use Mantine for**:
- Complex data display (DataTable with sorting, filtering, pagination)
- Advanced date/time inputs (DatePicker, DateRangePicker)
- Rich form components (MultiSelect, TransferList, Chip Input)
- Data visualization (Charts with recharts integration)
- Notification system
- Modals with complex interactions

**Example**:
```tsx
import { DataTable } from '@mantine/datatable';
import { DatePickerInput } from '@mantine/dates';
import { notifications } from '@mantine/notifications';

// Data table with pagination
<DataTable
  columns={columns}
  records={data}
  page={page}
  onPageChange={setPage}
  totalRecords={total}
  recordsPerPage={10}
  striped
  highlightOnHover
/>

// Date picker
<DatePickerInput
  label="Select date"
  placeholder="Pick date"
  value={value}
  onChange={setValue}
/>

// Notification
notifications.show({
  title: 'Success',
  message: 'Operation completed successfully!',
  color: 'green',
});
```

---

## 🌓 Dark Mode Best Practices

### Background Colors

```tsx
// Main background
className="bg-white dark:bg-gray-900"

// Secondary background (cards, panels)
className="bg-gray-50 dark:bg-gray-800"

// Tertiary background (hover states)
className="bg-gray-100 dark:bg-gray-700"

// Elevated surfaces (modals, popovers)
className="bg-white dark:bg-gray-800 shadow-lg"
```

### Border Colors

```tsx
// Default borders
className="border border-gray-200 dark:border-gray-800"

// Subtle borders
className="border-gray-100 dark:border-gray-700"

// Hover borders
className="hover:border-gray-300 dark:hover:border-gray-700"
```

### Interactive States

```tsx
// Hover background
className="hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"

// Active/Selected state
className="bg-primary-50 dark:bg-primary-950 border-primary-500"

// Focus ring
className="focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
```

### Card Component Example

```tsx
<Card className="
  group
  bg-white dark:bg-gray-900
  border border-gray-200 dark:border-gray-800
  hover:shadow-elegant-lg
  transition-all duration-200
">
  <CardHeader className="border-b border-gray-200 dark:border-gray-800">
    <CardTitle className="text-gray-900 dark:text-gray-50">
      Card Title
    </CardTitle>
    <CardDescription className="text-gray-500 dark:text-gray-400">
      Card description text
    </CardDescription>
  </CardHeader>

  <CardContent className="pt-6">
    <p className="text-gray-600 dark:text-gray-400">
      Card content goes here.
    </p>
  </CardContent>

  <CardFooter className="
    border-t border-gray-200 dark:border-gray-800
    justify-between
  ">
    <Button variant="ghost">Cancel</Button>
    <Button variant="default">Confirm</Button>
  </CardFooter>
</Card>
```

---

## 🎭 Border Radius

```css
/* Available radius tokens */
--radius-none: 0;
--radius-sm: 0.375rem;    /* 6px  - Small elements */
--radius-md: 0.5rem;      /* 8px  - Default */
--radius-lg: 0.75rem;     /* 12px - Cards, modals */
--radius-xl: 1rem;        /* 16px - Large containers */
--radius-2xl: 1.5rem;     /* 24px - Hero sections */
--radius-full: 9999px;    /* Circular (pills, avatars) */
```

**Usage**:
```tsx
// Buttons, inputs
className="rounded-md"

// Cards, panels
className="rounded-lg"

// Pills, badges
className="rounded-full"

// Avatar
className="rounded-full w-10 h-10"
```

---

## ✨ Shadows & Elevation

**Design System Shadows**:

```css
/* Standard shadows */
--shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
--shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
--shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1);
--shadow-xl: 0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1);

/* Elegant shadows (custom) */
--shadow-elegant: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -1px rgb(0 0 0 / 0.06);
--shadow-elegant-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -2px rgb(0 0 0 / 0.05);
--shadow-elegant-xl: 0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.04);
```

**Usage Guidelines**:

| Component | Shadow | Tailwind Class |
|-----------|--------|----------------|
| Subtle cards | Elegant | `shadow-elegant` |
| Hover cards | Elegant Large | `hover:shadow-elegant-lg` |
| Modals, popovers | XL | `shadow-xl` |
| Dropdown menus | Large | `shadow-lg` |
| Buttons (raised) | Medium | `shadow-md` |

```tsx
// Hover elevation effect
<Card className="
  shadow-elegant
  hover:shadow-elegant-lg
  transition-shadow duration-200
">
  Content
</Card>
```

---

## ⏱️ Animation & Transitions

### Transition Duration

```css
--duration-fast: 150ms;     /* Micro-interactions (hover, focus) */
--duration-default: 200ms;  /* Standard transitions */
--duration-slow: 300ms;     /* Page transitions, modals */
--duration-slower: 500ms;   /* Complex animations */
```

### Common Transition Patterns

```tsx
// Hover color change
className="transition-colors duration-200 hover:bg-gray-100"

// Hover scale
className="transition-transform duration-150 hover:scale-105"

// Hover shadow
className="transition-shadow duration-200 hover:shadow-elegant-lg"

// All properties
className="transition-all duration-200"

// Slide-in animation
className="transform transition-transform duration-300 translate-x-0"

// Fade-in animation
className="transition-opacity duration-300 opacity-100"
```

### Button Animations

```tsx
<Button className="
  transition-all duration-200
  hover:scale-105
  active:scale-95
  hover:shadow-md
">
  Interactive Button
</Button>
```

### Card Hover Effects

```tsx
<Card className="
  group
  transition-all duration-200
  hover:shadow-elegant-lg
  hover:-translate-y-1
">
  <CardTitle className="
    text-gray-900 dark:text-gray-50
    group-hover:text-primary-600
    transition-colors duration-200
  ">
    Card Title
  </CardTitle>
</Card>
```

---

## 📱 Responsive Design

### Breakpoints

```css
/* Tailwind CSS 4 breakpoints */
xs: 480px;   /* Mobile devices */
sm: 640px;   /* Mobile landscape / Small tablets */
md: 768px;   /* Tablets */
lg: 1024px;  /* Small desktop */
xl: 1280px;  /* Desktop */
2xl: 1536px; /* Large desktop */
```

### Container Configuration

```tsx
<div className="container mx-auto px-4 sm:px-6 lg:px-8">
  {/* Content auto-centers with responsive padding */}
</div>
```

**Container Widths**:
- Default: 100% with responsive padding
- Max width: 1400px (aligned with GitHub/GitLab)

### Responsive Patterns

```tsx
// Grid layout
<div className="
  grid
  grid-cols-1        /* Mobile: 1 column */
  md:grid-cols-2     /* Tablet: 2 columns */
  lg:grid-cols-3     /* Desktop: 3 columns */
  gap-6
">
  {/* Cards */}
</div>

// Text size
<h1 className="
  text-2xl sm:text-3xl lg:text-4xl
  font-bold
">
  Responsive Heading
</h1>

// Spacing
<div className="
  p-4           /* Mobile: 16px */
  md:p-6        /* Tablet: 24px */
  lg:p-8        /* Desktop: 32px */
">
  Content
</div>

// Flex direction
<div className="
  flex
  flex-col       /* Mobile: stack vertically */
  md:flex-row    /* Tablet+: horizontal */
  gap-4
">
  <div>Item 1</div>
  <div>Item 2</div>
</div>
```

---

## ♿ Accessibility (a11y)

### WCAG 2.1 AA Compliance

**Color Contrast Requirements**:
- Normal text (16px+): Minimum 4.5:1 contrast ratio
- Large text (24px+): Minimum 3:1 contrast ratio
- UI components: Minimum 3:1 contrast ratio

**Verified Contrast Ratios**:
```tsx
// Light mode
"text-gray-900 bg-white"        // 21:1 ✅
"text-gray-600 bg-white"        // 7.0:1 ✅
"text-primary-600 bg-white"     // 4.5:1 ✅

// Dark mode
"text-gray-50 bg-gray-900"      // 17.7:1 ✅
"text-gray-400 bg-gray-900"     // 7.2:1 ✅
"text-primary-400 bg-gray-900"  // 5.1:1 ✅
```

### Semantic HTML

```tsx
// ✅ Good: Semantic tags
<header>
  <nav>
    <a href="/dashboard">Dashboard</a>
  </nav>
</header>

<main>
  <article>
    <h1>Article Title</h1>
    <p>Content...</p>
  </article>
</main>

<footer>
  <p>&copy; 2025 Flotilla</p>
</footer>

// ❌ Bad: Generic divs only
<div>
  <div>
    <div>Link</div>
  </div>
</div>
```

### ARIA Labels

```tsx
// Buttons with icons only
<Button aria-label="Close dialog">
  <X className="h-4 w-4" />
</Button>

// Form inputs
<Input
  id="email"
  type="email"
  aria-label="Email address"
  aria-describedby="email-error"
  aria-invalid={!!error}
/>
{error && (
  <span id="email-error" role="alert" className="text-danger">
    {error}
  </span>
)}

// Loading states
<Button disabled aria-busy="true">
  <Loader2 className="animate-spin" />
  Loading...
</Button>
```

### Keyboard Navigation

```tsx
// Focus visible styles
<Button className="
  focus:outline-none
  focus:ring-2
  focus:ring-primary-500
  focus:ring-offset-2
  dark:focus:ring-offset-gray-900
">
  Accessible Button
</Button>

// Skip to main content
<a
  href="#main-content"
  className="
    sr-only
    focus:not-sr-only
    focus:absolute
    focus:top-4
    focus:left-4
    focus:z-50
    focus:px-4
    focus:py-2
    focus:bg-primary-600
    focus:text-white
    focus:rounded-md
  "
>
  Skip to main content
</a>
```

---

## 📦 Layout Patterns

### Page Container

```tsx
<div className="min-h-screen bg-white dark:bg-gray-900">
  <header className="border-b border-gray-200 dark:border-gray-800">
    <div className="container mx-auto px-4 py-4">
      {/* Header content */}
    </div>
  </header>

  <main className="container mx-auto px-4 py-8">
    {/* Main content */}
  </main>

  <footer className="border-t border-gray-200 dark:border-gray-800 mt-auto">
    <div className="container mx-auto px-4 py-6">
      {/* Footer content */}
    </div>
  </footer>
</div>
```

### Dashboard Layout

```tsx
<div className="flex h-screen bg-gray-50 dark:bg-gray-900">
  {/* Sidebar */}
  <aside className="
    w-64
    bg-white dark:bg-gray-900
    border-r border-gray-200 dark:border-gray-800
    overflow-y-auto
  ">
    {/* Navigation */}
  </aside>

  {/* Main content */}
  <div className="flex-1 flex flex-col overflow-hidden">
    {/* Header */}
    <header className="
      h-16
      bg-white dark:bg-gray-900
      border-b border-gray-200 dark:border-gray-800
      flex items-center px-6
    ">
      {/* Header content */}
    </header>

    {/* Scrollable content */}
    <main className="flex-1 overflow-y-auto p-6">
      {/* Dashboard content */}
    </main>
  </div>
</div>
```

### Form Layout

```tsx
<Card className="max-w-md mx-auto">
  <CardHeader>
    <CardTitle>Form Title</CardTitle>
    <CardDescription>Form description text</CardDescription>
  </CardHeader>

  <CardContent className="space-y-4">
    <div>
      <Label htmlFor="name">Name</Label>
      <Input
        id="name"
        placeholder="Enter your name"
        className="mt-2"
      />
    </div>

    <div>
      <Label htmlFor="email">Email</Label>
      <Input
        id="email"
        type="email"
        placeholder="your@email.com"
        className="mt-2"
      />
    </div>
  </CardContent>

  <CardFooter className="flex justify-between">
    <Button variant="ghost">Cancel</Button>
    <Button variant="default">Submit</Button>
  </CardFooter>
</Card>
```

---

## 🚀 Performance Guidelines

### CSS Bundle Optimization

**Target**: < 15KB compressed CSS

**Strategies**:
1. Use Tailwind's JIT mode (default in v4)
2. Purge unused classes automatically
3. Avoid `@apply` in components (use utility classes directly)
4. Minimize custom CSS

### Image Optimization

```tsx
// Use Next.js Image component
import Image from 'next/image';

<Image
  src="/images/hero.jpg"
  alt="Hero image"
  width={1200}
  height={600}
  priority // For above-the-fold images
  placeholder="blur" // Optional blur-up effect
/>
```

### Code Splitting

```tsx
// Lazy load heavy components
import dynamic from 'next/dynamic';

const MonacoEditor = dynamic(
  () => import('@/components/editor/monaco-editor'),
  { ssr: false, loading: () => <LoadingSpinner /> }
);
```

---

## 📝 Code Examples

### Complete Card Component

```tsx
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export function ProjectCard({ project }) {
  return (
    <Card className="
      group
      bg-white dark:bg-gray-900
      border border-gray-200 dark:border-gray-800
      hover:shadow-elegant-lg
      hover:-translate-y-1
      transition-all duration-200
    ">
      <CardHeader className="border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-start justify-between">
          <CardTitle className="
            text-xl font-semibold
            text-gray-900 dark:text-gray-50
            group-hover:text-primary-600 dark:group-hover:text-primary-400
            transition-colors duration-200
          ">
            {project.name}
          </CardTitle>
          <Badge variant={project.status === 'active' ? 'default' : 'secondary'}>
            {project.status}
          </Badge>
        </div>
        <CardDescription className="text-gray-500 dark:text-gray-400 mt-2">
          {project.description}
        </CardDescription>
      </CardHeader>

      <CardContent className="pt-4">
        <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
          <span>⭐ {project.stars}</span>
          <span>🔀 {project.forks}</span>
          <span>🐛 {project.issues}</span>
        </div>
      </CardContent>

      <CardFooter className="
        border-t border-gray-200 dark:border-gray-800
        justify-between
      ">
        <Button variant="ghost" size="sm">
          View Details
        </Button>
        <Button variant="default" size="sm">
          Clone
        </Button>
      </CardFooter>
    </Card>
  );
}
```

---

## 📚 Resources

### Internal Links
- [Mantine Theme Config](./src/config/mantine-theme.ts)
- [Design System Tokens](./src/config/design-system.ts)
- [Global CSS](./src/app/globals.css)

### External References
- [Tailwind CSS 4 Documentation](https://tailwindcss.com/docs)
- [Shadcn/ui Components](https://ui.shadcn.com)
- [Mantine Documentation](https://mantine.dev)
- [Radix UI Primitives](https://www.radix-ui.com)
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)

---

**Document Version**: 1.0.0
**Last Updated**: 2025-10-21
**Maintained by**: Flotilla Design Team

*"We don't just host code. We build consensus."* 🎨
