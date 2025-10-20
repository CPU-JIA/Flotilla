'use client'

import { motion } from 'framer-motion'
import { ExternalLink, Github, Star } from 'lucide-react'

export default function ShowcasePage() {
  const projects = [
    {
      name: 'Flotilla',
      description: 'The platform itself - distributed code hosting with Raft consensus algorithm',
      image: '/logo.svg',
      github: 'https://github.com/CPU-JIA/Cloud-Dev-Platform',
      demo: 'http://localhost:3000',
      tags: ['Raft', 'NestJS', 'Next.js', 'TypeScript'],
      stats: { stars: 128, forks: 24 },
    },
    {
      name: 'Raft Monitoring Dashboard',
      description: 'Real-time visualization of Raft cluster state with WebSocket updates',
      image: '/logo.svg',
      github: 'https://github.com/CPU-JIA/Cloud-Dev-Platform',
      demo: 'http://localhost:3000/monitoring',
      tags: ['React Flow', 'WebSocket', 'Recharts'],
      stats: { stars: 45, forks: 8 },
    },
    {
      name: 'Distributed File Storage',
      description: 'S3-compatible object storage with MinIO backend and automatic replication',
      image: '/logo.svg',
      github: 'https://github.com/CPU-JIA/Cloud-Dev-Platform',
      demo: 'http://localhost:3000/files',
      tags: ['MinIO', 'S3', 'Prisma'],
      stats: { stars: 32, forks: 6 },
    },
  ]

  return (
    <div className="py-16">
      <div className="container mx-auto px-4">
        {/* Hero */}
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold mb-4">
            Showcase
          </h1>
          <p className="text-xl text-foreground/60 max-w-2xl mx-auto">
            Real-world projects built with Flotilla. Production-ready distributed systems.
          </p>
        </div>

        {/* Projects Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
          {projects.map((project, index) => (
            <motion.div
              key={project.name}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className="group relative rounded-2xl bg-card border border-border/40 overflow-hidden hover:border-primary/50 hover:shadow-2xl transition-all"
            >
              {/* Image */}
              <div className="aspect-video bg-secondary/30 flex items-center justify-center border-b border-border/40">
                <img
                  src={project.image}
                  alt={project.name}
                  className="w-24 h-24 object-contain opacity-60 group-hover:opacity-100 group-hover:scale-110 transition-all"
                />
              </div>

              {/* Content */}
              <div className="p-6 space-y-4">
                <div>
                  <h3 className="text-xl font-bold mb-2 group-hover:text-primary transition-colors">
                    {project.name}
                  </h3>
                  <p className="text-sm text-foreground/70 leading-relaxed">
                    {project.description}
                  </p>
                </div>

                {/* Tags */}
                <div className="flex flex-wrap gap-2">
                  {project.tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-2 py-1 rounded-md bg-secondary/50 text-xs font-medium"
                    >
                      {tag}
                    </span>
                  ))}
                </div>

                {/* Stats & Links */}
                <div className="flex items-center justify-between pt-4 border-t border-border/40">
                  <div className="flex items-center gap-4 text-sm text-foreground/60">
                    <div className="flex items-center gap-1">
                      <Star className="h-4 w-4" />
                      {project.stats.stars}
                    </div>
                    <div className="flex items-center gap-1">
                      <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-5-9h10v2H7z"/>
                      </svg>
                      {project.stats.forks}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <a
                      href={project.github}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-9 h-9 rounded-lg bg-secondary hover:bg-secondary/80 flex items-center justify-center transition-colors"
                      aria-label="View source"
                    >
                      <Github className="h-4 w-4" />
                    </a>
                    <a
                      href={project.demo}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-9 h-9 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 flex items-center justify-center transition-colors"
                      aria-label="View demo"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* CTA */}
        <div className="text-center mt-16 p-8 rounded-2xl bg-secondary/20 border border-border/40">
          <h2 className="text-2xl font-bold mb-4">
            Built something with Flotilla?
          </h2>
          <p className="text-foreground/70 mb-6">
            We would love to feature your project here. Submit a pull request or open an issue on GitHub.
          </p>
          <a
            href="https://github.com/CPU-JIA/Cloud-Dev-Platform/issues/new"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 h-11 rounded-lg bg-foreground text-background hover:bg-foreground/90 transition-colors font-medium"
          >
            Submit Your Project
            <ExternalLink className="h-4 w-4" />
          </a>
        </div>
      </div>
    </div>
  )
}
