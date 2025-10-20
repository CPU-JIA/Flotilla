# Website Image Optimization Guide

## Current Status

Total images in `website/public/images/`: **9 PNG files (5.4MB)**

### Image Inventory

| File | Size | Used In | Priority |
|------|------|---------|----------|
| 抽象分布式网络.png | 1.1MB | Hero background | **High** |
| 写作氛围.png | 1.1MB | Not currently used | Medium |
| 全球协作团队.png | 923KB | Not currently used | Medium |
| 架构可视化.png | 789KB | Technology Stack section | **High** |
| 3节点集群运行.png | 618KB | Showcase page | Medium |
| logo.png | 531KB | Header logo | **High** |
| dashboard.png | 280KB | Product Preview | **High** |
| team-management.png | 149KB | Product Preview | Medium |
| code-editor.png | 34KB | Product Preview | Low |

---

## Optimization Strategy

### Option 1: Manual Conversion (Recommended)

Use [Squoosh.app](https://squoosh.app) for best results:

1. Upload PNG file
2. Select WebP format
3. Adjust quality to 80-85%
4. Download optimized file
5. Replace original file (or save as `.webp` and update code)

**Expected reduction**: 50-80% file size

### Option 2: Next.js Image Optimization (Already Active)

We're already using `next/image` component, which automatically optimizes images:

```jsx
<Image
  src="/images/抽象分布式网络.png"
  width={800}
  height={600}
  // Next.js will auto-optimize on request
/>
```

**No action needed** - Next.js handles this automatically in production.

### Option 3: CLI Conversion (Requires ImageMagick)

```bash
# Install ImageMagick first
# Windows: https://imagemagick.org/script/download.php
# macOS: brew install imagemagick
# Linux: sudo apt install imagemagick

# Convert single file
magick convert input.png -quality 85 output.webp

# Batch convert all PNGs
cd website/public/images
for file in *.png; do
  magick convert "$file" -quality 85 "${file%.png}.webp"
done
```

---

## Priority Actions

### High Priority (Hero section images)

1. **抽象分布式网络.png (1.1MB)** → Target 200KB
   - Used in Hero background
   - High impact on LCP (Largest Contentful Paint)

2. **logo.png (531KB)** → Target 50KB
   - Loaded on every page
   - Consider SVG instead

3. **架构可视化.png (789KB)** → Target 150KB
   - Technology Stack section
   - Important for understanding

4. **dashboard.png (280KB)** → Target 80KB
   - Product Preview screenshot
   - First impression matters

### Medium Priority

5. **team-management.png (149KB)** → Target 50KB
6. **3节点集群运行.png (618KB)** → Target 150KB

### Low Priority

7. **code-editor.png (34KB)** → Already small
8. **写作氛围.png, 全球协作团队.png** → Not currently used, can defer

---

## Expected Results

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| **Total Size** | 5.4MB | ~1.5MB | **72% reduction** |
| **LCP** | ~3s | ~1s | **67% faster** |
| **Bandwidth** | High | Low | **Saves 3.9MB per visit** |

---

## Implementation Checklist

- [ ] Convert high-priority PNGs to WebP
- [ ] Update image references in MDX files (if using `.webp` extension)
- [ ] Test all pages to ensure images display correctly
- [ ] Run Lighthouse audit to verify improvement
- [ ] Consider lazy-loading for below-the-fold images

---

## Notes

- Next.js Image component already provides automatic optimization
- WebP conversion is **optional** but recommended for best performance
- Keep original PNG files as backups
- Modern browsers support WebP (95%+ coverage)
