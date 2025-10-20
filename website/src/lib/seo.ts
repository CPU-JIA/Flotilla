import type { Metadata } from 'next'

interface SEOProps {
  title: string
  description: string
  keywords?: string[]
  ogImage?: string
  noindex?: boolean
}

export function generateMetadata({
  title,
  description,
  keywords = [],
  ogImage = '/og-image.png',
  noindex = false,
}: SEOProps): Metadata {
  const siteTitle = 'Flotilla'
  const fullTitle = title === siteTitle ? title : `${title} | ${siteTitle}`

  return {
    metadataBase: new URL('https://flotilla.dev'),
    title: fullTitle,
    description,
    keywords: [
      'Raft consensus',
      'distributed systems',
      'TypeScript',
      'Next.js',
      'NestJS',
      'Git hosting',
      'code collaboration',
      ...keywords,
    ],
    authors: [{ name: 'JIA', url: 'https://github.com/CPU-JIA' }],
    creator: 'JIA',
    publisher: 'Flotilla',
    robots: noindex ? 'noindex, nofollow' : 'index, follow',
    openGraph: {
      type: 'website',
      locale: 'en_US',
      alternateLocale: ['zh_CN'],
      siteName: siteTitle,
      title: fullTitle,
      description,
      images: [
        {
          url: ogImage,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title: fullTitle,
      description,
      images: [ogImage],
      creator: '@FlotillaHQ',
    },
  }
}
