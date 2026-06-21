# UI Design and Responsiveness Conventions

This document outlines the visual system, style constraints, and responsiveness behaviors for components.

## 1. Visual Identity
- **Styling Method**: Use Vanilla CSS written in [style.css](../src/css/style.css).
- **No Tailwind CSS**: Do not use Tailwind CSS. Maintain styling in the Vanilla CSS system.
- **No Inline Styles**: `style="..."` attributes and `<style>` blocks in HTML are prohibited by the project's Content Security Policy — see [security.md](security.md) for details. Always use CSS classes.
- **Color Palette**: Maintain the established theme colors: Blue, Orange, Yellow, and White.
- **Design Language**: Keep design premium with modern elements like glassmorphism (translucent, blurred backdrops using `backdrop-filter: blur()`), CSS variables, and a mix of `Inter` and `Playfair Display` typography.

## 2. Font Sizing and Hierarchy
- **Script Font Proportions**: Script typefaces (like `Pinyon Script`) look visually smaller than sans-serif or serif fonts at the same point size. Ensure script fonts are styled with larger mobile and desktop sizing (a minimum of `3.2rem` or using responsive scales like `clamp(3.6rem, 12vw, 4.5rem)`) so they remain legible and prominent.

## 3. Layout Sizing and Scaling
- **Proportional Height Scaling**: When optimizing layouts for short viewports (such as laptops, landscape tablets, or smart displays) using `@media (max-height: ...)` media queries, ensure all elements (text, padding, margins, card dimensions) scale down proportionally. Do not reduce the title size alone, as this creates visual imbalance with the rest of the text.

## 4. Z-Index and Component Layering
To prevent floating UI components (such as a sticky cart button) from overlapping footer actions or modal content, adhere to these stacking rules:
- **Modal Backdrops**: Open modal backdrops must live at `z-index: 1100`.
- **Floating Controls**: Keep sticky floating buttons or widgets at `z-index: 1050` or lower. This ensures floating actions sit behind the backdrop overlay when a modal is open.
