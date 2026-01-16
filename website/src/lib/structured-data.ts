/**
 * Generate JSON-LD structured data for SEO
 * Follows Schema.org standards for rich snippets
 */

export interface OrganizationSchema {
  '@context': 'https://schema.org'
  '@type': 'Organization'
  name: string
  url: string
  logo: string
  description: string
  foundingDate?: string
  sameAs?: string[]
  contactPoint?: {
    '@type': 'ContactPoint'
    contactType: string
    url: string
  }
}

export interface WebSiteSchema {
  '@context': 'https://schema.org'
  '@type': 'WebSite'
  name: string
  url: string
  description: string
  potentialAction?: {
    '@type': 'SearchAction'
    target: string
    'query-input': string
  }
}

export interface SoftwareApplicationSchema {
  '@context': 'https://schema.org'
  '@type': 'SoftwareApplication'
  name: string
  applicationCategory: string
  operatingSystem: string
  offers: {
    '@type': 'Offer'
    price: string
    priceCurrency: string
  }
  aggregateRating?: {
    '@type': 'AggregateRating'
    ratingValue: string
    reviewCount: string
  }
}

export interface BlogPostingSchema {
  '@context': 'https://schema.org'
  '@type': 'BlogPosting'
  headline: string
  description: string
  author: {
    '@type': 'Person' | 'Organization'
    name: string
  }
  datePublished: string
  dateModified?: string
  image?: string
  publisher: {
    '@type': 'Organization'
    name: string
    logo: {
      '@type': 'ImageObject'
      url: string
    }
  }
}

export interface BreadcrumbListSchema {
  '@context': 'https://schema.org'
  '@type': 'BreadcrumbList'
  itemListElement: Array<{
    '@type': 'ListItem'
    position: number
    name: string
    item?: string
  }>
}

/**
 * Generate Organization schema for Flotilla
 */
export function generateOrganizationSchema(baseUrl: string): OrganizationSchema {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Flotilla',
    url: baseUrl,
    logo: `${baseUrl}/images/logo-transparent.png`,
    description:
      'Production-ready distributed code hosting platform with Raft consensus algorithm. 150ms automatic failover. Open source. MIT License.',
    foundingDate: '2024',
    sameAs: ['https://github.com/CPU-JIA/Cloud-Dev-Platform'],
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'Technical Support',
      url: `${baseUrl}/about`,
    },
  }
}

/**
 * Generate WebSite schema with search action
 */
export function generateWebSiteSchema(baseUrl: string): WebSiteSchema {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'Flotilla',
    url: baseUrl,
    description:
      'Distributed code hosting with Raft consensus. Make distributed teams as reliable as distributed systems.',
    potentialAction: {
      '@type': 'SearchAction',
      target: `${baseUrl}/docs?q={search_term_string}`,
      'query-input': 'required name=search_term_string',
    },
  }
}

/**
 * Generate SoftwareApplication schema for Flotilla
 */
export function generateSoftwareApplicationSchema(): SoftwareApplicationSchema {
  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'Flotilla',
    applicationCategory: 'DeveloperApplication',
    operatingSystem: 'Linux, macOS, Windows',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
    },
  }
}

/**
 * Generate BlogPosting schema for blog articles
 */
export function generateBlogPostingSchema(
  baseUrl: string,
  post: {
    title: string
    description: string
    author: string
    date: string
    slug: string
  }
): BlogPostingSchema {
  return {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    description: post.description,
    author: {
      '@type': 'Organization',
      name: post.author,
    },
    datePublished: post.date,
    dateModified: post.date,
    publisher: {
      '@type': 'Organization',
      name: 'Flotilla',
      logo: {
        '@type': 'ImageObject',
        url: `${baseUrl}/images/logo-transparent.png`,
      },
    },
  }
}

/**
 * Generate BreadcrumbList schema for navigation
 */
export function generateBreadcrumbSchema(
  items: Array<{ name: string; url?: string }>
): BreadcrumbListSchema {
  const baseUrl = process.env.NEXT_PUBLIC_WEBSITE_URL || 'https://flotilla.dev'
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url ? `${baseUrl}${item.url}` : undefined,
    })),
  }
}

/**
 * Render JSON-LD script tag (for use in components)
 */
export function renderJsonLd(data: unknown) {
  return {
    __html: JSON.stringify(data),
  }
}
