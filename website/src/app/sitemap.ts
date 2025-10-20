export default function sitemap() {
  const baseUrl = 'https://clouddev.com'
  const currentDate = new Date().toISOString()

  const routes = [
    '',
    '/docs',
    '/showcase',
    '/about',
    '/faq',
  ]

  const locales = ['zh', 'en']

  const urls = []

  // Generate URLs for all routes in all locales
  for (const locale of locales) {
    for (const route of routes) {
      urls.push({
        url: `${baseUrl}/${locale}${route}`,
        lastModified: currentDate,
        changeFrequency: route === '' ? 'weekly' : 'monthly',
        priority: route === '' ? 1.0 : 0.8,
      })
    }
  }

  return urls
}
