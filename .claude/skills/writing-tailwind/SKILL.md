---
name: writing-tailwind
description: Tailwind CSS best practices and guidelines. Use when writing Tailwind CSS classes, reviewing utility classes, or working with Tailwind in any capacity.
---

# Rules and Best Practices

## Core Principles

- **Always use Tailwind CSS v4.1+** - Ensure the codebase is using the latest version
- **Do not use deprecated or removed utilities** - ALWAYS use the replacement
- **Never use `@apply`** - Use CSS variables, the `--spacing()` function, or framework components instead
- **Check for redundant classes** - Remove any classes that aren't necessary
- **Group elements logically** to simplify responsive tweaks later

## Breaking Changes Reference

### Removed Utilities (NEVER use these in v4)

| ❌ Deprecated           | ✅ Replacement                                    |
| ----------------------- | ------------------------------------------------- |
| `bg-opacity-*`          | Use opacity modifiers like `bg-black/50`          |
| `text-opacity-*`        | Use opacity modifiers like `text-black/50`        |
| `border-opacity-*`      | Use opacity modifiers like `border-black/50`      |
| `divide-opacity-*`      | Use opacity modifiers like `divide-black/50`      |
| `ring-opacity-*`        | Use opacity modifiers like `ring-black/50`        |
| `placeholder-opacity-*` | Use opacity modifiers like `placeholder-black/50` |
| `flex-shrink-*`         | `shrink-*`                                        |
| `flex-grow-*`           | `grow-*`                                          |
| `overflow-ellipsis`     | `text-ellipsis`                                   |
| `decoration-slice`      | `box-decoration-slice`                            |
| `decoration-clone`      | `box-decoration-clone`                            |

### Renamed Utilities (ALWAYS use the v4 name)

| ❌ v3              | ✅ v4              |
| ------------------ | ------------------ |
| `bg-gradient-*`    | `bg-linear-*`      |
| `shadow-sm`        | `shadow-xs`        |
| `shadow`           | `shadow-sm`        |
| `drop-shadow-sm`   | `drop-shadow-xs`   |
| `drop-shadow`      | `drop-shadow-sm`   |
| `blur-sm`          | `blur-xs`          |
| `blur`             | `blur-sm`          |
| `backdrop-blur-sm` | `backdrop-blur-xs` |
| `backdrop-blur`    | `backdrop-blur-sm` |
| `rounded-sm`       | `rounded-xs`       |
| `rounded`          | `rounded-sm`       |
| `outline-none`     | `outline-hidden`   |
| `ring`             | `ring-3`           |

## Layout and Spacing Rules

### Flexbox and Grid Spacing

#### Always use gap utilities for internal spacing

Gap provides consistent spacing without edge cases. It's cleaner and more maintainable than margins on children.

```html
<!-- ❌ Don't do this -->
<div class="flex">
  <div class="mr-4">Item 1</div>
  <div class="mr-4">Item 2</div>
  <div>Item 3</div>
</div>

<!-- ✅ Do this instead -->
<div class="flex gap-4">
  <div>Item 1</div>
  <div>Item 2</div>
  <div>Item 3</div>
</div>
```

#### Gap vs Space utilities

- **Never use `space-x-*` or `space-y-*` in flex/grid layouts** - always use gap
- Space utilities add margins to children and have issues with wrapped items
- Gap works correctly with flex-wrap and all flex directions

```html
<!-- ❌ Avoid space utilities in flex containers -->
<div class="flex flex-wrap space-x-4">
  <!-- Space utilities break with wrapped items -->
</div>

<!-- ✅ Use gap for consistent spacing -->
<div class="flex flex-wrap gap-4">
  <!-- Gap works perfectly with wrapping -->
</div>
```

### General Spacing Guidelines

- **Prefer top and left margins** over bottom and right margins
- **Use padding on parent containers** instead of bottom margins on the last child
- **Always use `min-h-dvh` instead of `min-h-screen`** - `min-h-screen` is buggy on mobile Safari
- **Prefer `size-*` utilities** over separate `w-*` and `h-*` when setting equal dimensions
- For max-widths, prefer the container scale (e.g., `max-w-2xs` over `max-w-72`)

## Typography Rules

### Line Heights

- **Never use `leading-*` classes** - Always use line height modifiers with text size
- **Always use fixed line heights from the spacing scale**

```html
<!-- ❌ Don't do this -->
<p class="text-base leading-7">Text with separate line height</p>
<p class="text-lg leading-relaxed">Text with named line height</p>

<!-- ✅ Do this instead -->
<p class="text-base/7">Text with line height modifier</p>
<p class="text-lg/8">Text with specific line height</p>
```

### Font Size Reference

- `text-xs` = 12px
- `text-sm` = 14px
- `text-base` = 16px
- `text-lg` = 18px
- `text-xl` = 20px

## Color and Opacity

**Never use `bg-opacity-*`, `text-opacity-*`, etc.** - use the opacity modifier syntax:

```html
<!-- ❌ Don't do this -->
<div class="bg-red-500 bg-opacity-60">Old opacity syntax</div>

<!-- ✅ Do this instead -->
<div class="bg-red-500/60">Modern opacity syntax</div>
```

## Responsive Design

### Breakpoint Optimization

- **Check for redundant classes across breakpoints**
- **Only add breakpoint variants when values change**

```html
<!-- ❌ Redundant breakpoint classes -->
<div class="px-4 md:px-4 lg:px-4">
  <!-- md:px-4 and lg:px-4 are redundant -->
</div>

<!-- ✅ Efficient breakpoint usage -->
<div class="px-4 lg:px-8">
  <!-- Only specify when value changes -->
</div>
```

## Dark Mode

- Use the plain `dark:` variant pattern
- Put light mode styles first, then dark mode styles
- Ensure `dark:` variant comes before other variants

```html
<!-- ✅ Correct dark mode pattern -->
<div class="bg-white text-black dark:bg-black dark:text-white">
  <button class="hover:bg-gray-100 dark:hover:bg-gray-800">Click me</button>
</div>
```

## Gradient Utilities

- **ALWAYS Use `bg-linear-*` instead of `bg-gradient-*` utilities** - renamed in v4
- Use the new `bg-radial` or `bg-radial-[<position>]` for radial gradients
- Use the new `bg-conic` or `bg-conic-*` for conic gradients

```html
<!-- ✅ Use the new gradient utilities -->
<div class="h-14 bg-linear-to-br from-violet-500 to-fuchsia-500"></div>
<div class="size-18 bg-radial-[at_50%_75%] from-sky-200 via-blue-400 to-indigo-900 to-90%"></div>
<div class="size-24 bg-conic-180 from-indigo-600 via-indigo-50 to-indigo-600"></div>

<!-- ❌ Do not use bg-gradient-* utilities -->
<div class="h-14 bg-gradient-to-br from-violet-500 to-fuchsia-500"></div>
```

## Working with CSS Variables

### Accessing Theme Values

Tailwind CSS v4 exposes all theme values as CSS variables:

```css
.custom-element {
  background: var(--color-red-500);
  border-radius: var(--radius-lg);
}
```

### The `--spacing()` Function

Use the dedicated `--spacing()` function for spacing calculations:

```css
.custom-class {
  margin-top: calc(100vh - --spacing(16));
}
```

### Extending theme values

Use CSS to extend theme values:

```css
@import "tailwindcss";

@theme {
  --color-mint-500: oklch(0.72 0.11 178);
}
```

## New v4 Features

### Container Queries

Use the `@container` class and size variants:

```html
<article class="@container">
  <div class="flex flex-col @md:flex-row @lg:gap-8">
    <img class="w-full @md:w-48" />
    <div class="mt-4 @md:mt-0">
      <!-- Content adapts to container size -->
    </div>
  </div>
</article>
```

### Text Shadows (v4.1)

Use text-shadow-* utilities from text-shadow-2xs to text-shadow-lg:

```html
<h1 class="text-shadow-lg">Large shadow</h1>
<p class="text-shadow-sm/50">Small shadow with opacity</p>
```

### Masking (v4.1)

Use the new composable mask utilities:

```html
<!-- Linear gradient masks -->
<div class="mask-t-from-50%">Top fade</div>
<div class="mask-b-from-20% mask-b-to-80%">Bottom gradient</div>

<!-- Radial gradient masks -->
<div class="mask-radial-[100%_100%] mask-radial-from-75% mask-radial-at-left">Radial mask</div>
```

## Common Pitfalls to Avoid

1. **Using old opacity utilities** - Always use `/opacity` syntax like `bg-red-500/60`
2. **Redundant breakpoint classes** - Only specify changes
3. **Space utilities in flex/grid** - Always use gap
4. **Leading utilities** - Use line-height modifiers like `text-sm/6`
5. **Arbitrary values** - Use the design scale
6. **@apply directive** - Use components or CSS variables
7. **min-h-screen on mobile** - Use min-h-dvh
8. **Separate width/height** - Use size utilities when equal
9. **Arbitrary values** - Always use Tailwind's predefined scale (e.g., `ml-4` over `ml-[16px]`)
