'use client'

import * as React from 'react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { motion } from 'framer-motion'
import { Zap, Globe, BookOpen, Code, CheckCircle, Heart } from 'lucide-react'
import { cn } from '@/lib/utils'

const features = [
  {
    key: 'raft',
    icon: Zap,
    color: 'text-accent',
    bgColor: 'bg-accent/10',
    borderColor: 'hover:border-accent/50',
    gridArea: 'lg:col-span-2',
  },
  {
    key: 'global',
    icon: Globe,
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
    borderColor: 'hover:border-blue-500/50',
    gridArea: 'lg:col-span-1',
  },
  {
    key: 'academic',
    icon: BookOpen,
    color: 'text-purple-500',
    bgColor: 'bg-purple-500/10',
    borderColor: 'hover:border-purple-500/50',
    gridArea: 'lg:col-span-1',
  },
  {
    key: 'typescript',
    icon: Code,
    color: 'text-primary',
    bgColor: 'bg-primary/10',
    borderColor: 'hover:border-primary/50',
    gridArea: 'lg:col-span-2',
  },
  {
    key: 'testing',
    icon: CheckCircle,
    color: 'text-green-500',
    bgColor: 'bg-green-500/10',
    borderColor: 'hover:border-green-500/50',
    gridArea: 'lg:col-span-2',
  },
  {
    key: 'opensource',
    icon: Heart,
    color: 'text-red-500',
    bgColor: 'bg-red-500/10',
    borderColor: 'hover:border-red-500/50',
    gridArea: 'lg:col-span-1',
  },
]

export function FeaturesBentoGrid() {
  const t = useTranslations()

  return (
    <section className="py-24 bg-secondary/20">
      <div className="container mx-auto px-4">
        {/* Section Header */}
        <div className="text-center mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="text-4xl sm:text-5xl font-bold mb-4">
              Built for reliability.
              <br />
              <span className="bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
                Designed for developers.
              </span>
            </h2>
            <p className="text-lg text-foreground/60 max-w-3xl mx-auto">
              Production-ready distributed consensus with Raft algorithm, academic rigor, and modern
              tooling. Every feature is battle-tested and documented.
            </p>
          </motion.div>
        </div>

        {/* Bento Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-7xl mx-auto">
          {features.map((feature, index) => {
            const Icon = feature.icon
            const featureData = t.raw(`features.${feature.key}`) as {
              title: string
              description: string
              highlight: string
            }

            return (
              <motion.div
                key={feature.key}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className={cn(
                  'group relative p-8 rounded-3xl bg-card border border-border/40 transition-all duration-300',
                  feature.gridArea,
                  feature.borderColor,
                  'hover:shadow-2xl hover:shadow-primary/10 hover:-translate-y-1'
                )}
              >
                {/* Icon with animated background */}
                <div className="relative mb-6">
                  <div
                    className={cn(
                      'absolute inset-0 rounded-2xl blur-xl opacity-20 group-hover:opacity-30 transition-opacity',
                      feature.bgColor
                    )}
                  />
                  <div
                    className={cn(
                      'relative w-14 h-14 rounded-2xl flex items-center justify-center',
                      feature.bgColor,
                      'group-hover:scale-110 transition-transform'
                    )}
                  >
                    <Icon className={cn('h-7 w-7', feature.color)} />
                  </div>
                </div>

                {/* Content */}
                <div className="space-y-4">
                  <h3 className="text-2xl font-bold group-hover:text-primary transition-colors">
                    {featureData.title}
                  </h3>

                  <p className="text-foreground/70 leading-relaxed">{featureData.description}</p>

                  {/* Highlight Badge */}
                  <div className="flex items-center gap-2 pt-2">
                    <div
                      className={cn(
                        'w-1.5 h-1.5 rounded-full',
                        feature.color.replace('text-', 'bg-')
                      )}
                    />
                    <span className={cn('text-sm font-medium', feature.color)}>
                      {featureData.highlight}
                    </span>
                  </div>
                </div>

                {/* Hover glow effect */}
                <div
                  className={cn(
                    'absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none',
                    'bg-gradient-to-br',
                    feature.bgColor
                  )}
                  style={{ mixBlendMode: 'overlay' }}
                />
              </motion.div>
            )
          })}
        </div>

        {/* Bottom CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.6 }}
          className="text-center mt-16"
        >
          <p className="text-foreground/60 mb-6">Want to see it in action?</p>
          <Link
            href="/docs"
            className="inline-flex items-center gap-2 px-8 h-12 rounded-lg bg-foreground text-background hover:bg-foreground/90 transition-colors font-medium shadow-lg"
          >
            Explore Documentation →
          </Link>
        </motion.div>
      </div>
    </section>
  )
}
