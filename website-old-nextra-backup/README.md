# Cloud Dev Platform Website

> Official documentation website for Cloud Dev Platform

**Built with:** [Nextra](https://nextra.site/) (Next.js 15 + MDX)

## 🚀 Quick Start

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev
# Visit http://localhost:3002

# Build for production
pnpm build

# Start production server
pnpm start
```

## 📂 Project Structure

```
website/
├── pages/
│   ├── _app.tsx             # Custom App with Nextra theme styles
│   ├── _meta.json           # English navigation
│   ├── _meta.zh.json        # Chinese navigation
│   ├── index.en.mdx         # English homepage
│   ├── index.zh.mdx         # Chinese homepage
│   ├── docs/
│   │   ├── _meta.json       # Docs navigation (EN)
│   │   ├── _meta.zh.json    # Docs navigation (ZH)
│   │   ├── getting-started.en.mdx
│   │   └── getting-started.zh.mdx
│   ├── showcase.en.mdx
│   ├── showcase.zh.mdx
│   ├── about.en.mdx
│   └── about.zh.mdx
├── theme.config.tsx         # Nextra theme configuration with i18n
├── next.config.js           # Next.js + Nextra integration
└── package.json
```

## 🌍 i18n Support

This website supports **English (en)** and **Chinese (zh)** via Nextra's file suffix approach:

- **English files**: `*.en.mdx`
- **Chinese files**: `*.zh.mdx`
- **Configuration**:
  - `next.config.js` - Next.js i18n routing (`locales: ['en', 'zh']`)
  - `theme.config.tsx` - Nextra i18n config with language switcher
  - `pages/_meta.json` / `pages/_meta.zh.json` - Navigation per locale

### Accessing Languages

- English: http://localhost:3002/en
- Chinese: http://localhost:3002/zh
- Default (English): http://localhost:3002

## ✨ Features

- ✅ **Nextra 4.x** - Latest MDX-based documentation framework
- ✅ **Full i18n** - English/Chinese with automatic language switching
- ✅ **Dark Mode** - System preference detection + manual toggle
- ✅ **Search** - Built-in full-text search (Nextra feature)
- ✅ **Responsive** - Mobile-friendly design
- ✅ **SEO Optimized** - Meta tags, OpenGraph, schema
- ✅ **Cards Component** - Rich feature showcase on homepage
- ✅ **Syntax Highlighting** - Code blocks with copy button

## 📄 Content Pages

| Page | Status | Description |
|------|--------|-------------|
| Homepage (index) | ✅ Complete | Hero + 6 Features cards |
| Quick Start (docs/getting-started) | ✅ Complete | 10-minute setup guide |
| Showcase | 🚧 Placeholder | Raft visualization (future) |
| About | ✅ Complete | Brand story & philosophy |

## 🔧 Configuration Files

### `next.config.js`

```js
import nextra from 'nextra'

const withNextra = nextra({
  defaultShowCopyCode: true,
})

export default withNextra({
  i18n: {
    locales: ['en', 'zh'],
    defaultLocale: 'en'
  },
  // ... other Next.js config
})
```

### `theme.config.tsx`

- Logo: Text-based "Cloud Dev Platform"
- GitHub link integration
- i18n language switcher (EN/ZH)
- Footer with MIT license
- SEO meta tags
- Primary color hue: 210 (blue)

## 📦 Dependencies

```json
{
  "dependencies": {
    "next": "^15.0.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "nextra": "latest",
    "nextra-theme-docs": "latest",
    "next-themes": "^0.4.4"
  }
}
```

## 🚢 Deployment

This website is designed to be deployed on [Vercel](https://vercel.com) with zero configuration:

1. Push to GitHub
2. Import repository to Vercel
3. Deploy automatically (Vercel detects Next.js)

**Environment Variables** (optional):
- `NEXT_PUBLIC_API_URL` - Backend API URL for production

## 🔗 Links

- **Main Repository**: [CPU-JIA/Cloud-Dev-Platform](https://github.com/CPU-JIA/Cloud-Dev-Platform)
- **Documentation**: See `/docs` directory in main repository
- **License**: MIT

---

**Status**: ✅ **Ready for Local Testing**
**Version**: v1.0.0
**Last Updated**: 2025-10-19

## 💡 Development Notes

- Port **3002** to avoid conflict with main app (port 3000)
- TypeScript strict mode enabled
- ES Module format (`"type": "module"` in package.json)
- Standalone output for optimized Docker deployment
