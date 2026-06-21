# Static Assets and Performance Optimization

This document covers how static assets (images, videos) are managed in this project: CDN hosting via ImageKit.io, responsive transformation conventions, and rules for local vs. production assets.

To prevent Firebase Hosting bandwidth exhaustion and ensure fast page load times, high-resolution static images are hosted on a CDN and loaded with responsive transformations.

## 1. CDN Hosting (ImageKit.io)
- **CDN ID**: `vfxvr8vqa`
- **Path**: All assets must live in the `wedding-site/` folder on ImageKit.
- **Repository Restriction**: Never upload or commit raw, high-resolution image files directly to the `public/images/` folder in the repository.

## 2. Responsive Transformation Best Practices
ImageKit supports real-time transformations via URL query parameters. Always leverage these to deliver optimized assets:
- **Large Backgrounds / Hero Assets**: Implement responsive HTML `<img srcset="..." sizes="..." />` using ImageKit width transformations (e.g. `?tr=w-600`, `?tr=w-1000`, `?tr=w-1600`) to match the user's viewport width.
- **Fixed Display Elements**: Request exact display width transformations to avoid downloading high-resolution files. For example:
  - Append `?tr=w-200` for logos (displayed at max width ~200px).
  - Append `?tr=w-500` for destination cards (displayed at max width ~500px).
- **Format**: ImageKit automatically optimizes format (e.g. WebP/AVIF) based on browser compatibility, but requesting custom transformations ensures minimal payload size.

## 3. Design Iterations and Local Assets
- **Local Copies**: Any raw mock images used during layout design iterations must be placed in a directory ignored by Git (e.g., `imagekit-to-upload/`).
- **Production Code**: Production files must not link to any local mock images; all images must be hosted on ImageKit.
