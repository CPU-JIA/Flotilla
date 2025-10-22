import { motion } from 'framer-motion'
import { Calendar, Clock, Tag, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import { getAllPosts } from '@/lib/blog'
import { NewsletterForm } from '@/components/newsletter/newsletter-form'

export default function BlogPage() {
  const posts = getAllPosts()

  return (
    <div className="py-16">
      <div className="container mx-auto px-4">
        {/* Hero Section */}
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold mb-4">Blog</h1>
          <p className="text-xl text-foreground/60 max-w-2xl mx-auto">
            Insights on distributed systems, consensus algorithms, and building
            production-ready infrastructure.
          </p>
        </div>

        {/* Posts Grid */}
        <div className="max-w-4xl mx-auto space-y-8">
          {posts.map((post, index) => (
            <motion.article
              key={post.slug}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="group"
            >
              <Link
                href={`/blog/${post.slug}`}
                className="block p-8 rounded-2xl bg-card border border-border/40 hover:border-primary/50 hover:shadow-2xl transition-all"
              >
                {/* Post Header */}
                <div className="mb-4">
                  <h2 className="text-2xl font-bold mb-3 group-hover:text-primary transition-colors">
                    {post.title}
                  </h2>
                  <p className="text-foreground/70 leading-relaxed">
                    {post.description}
                  </p>
                </div>

                {/* Tags */}
                <div className="flex flex-wrap gap-2 mb-4">
                  {post.tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 px-3 py-1 rounded-md bg-secondary/50 text-xs font-medium"
                    >
                      <Tag className="h-3 w-3" />
                      {tag}
                    </span>
                  ))}
                </div>

                {/* Post Meta */}
                <div className="flex items-center gap-6 text-sm text-foreground/60 border-t border-border/40 pt-4">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    <time dateTime={post.date}>
                      {new Date(post.date).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </time>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    <span>{post.readingTime}</span>
                  </div>
                  <div className="ml-auto flex items-center gap-2 text-primary font-medium group-hover:gap-3 transition-all">
                    Read More
                    <ArrowRight className="h-4 w-4" />
                  </div>
                </div>
              </Link>
            </motion.article>
          ))}
        </div>

        {/* Empty State (shown when no posts) */}
        {posts.length === 0 && (
          <div className="text-center py-16">
            <p className="text-lg text-foreground/60">
              No blog posts yet. Check back soon!
            </p>
          </div>
        )}

        {/* Newsletter CTA */}
        <div className="mt-16 max-w-4xl mx-auto">
          <NewsletterForm />
        </div>
      </div>
    </div>
  )
}
