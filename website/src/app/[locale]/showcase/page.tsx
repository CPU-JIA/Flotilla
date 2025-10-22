'use client'

import { motion } from 'framer-motion'
import { ExternalLink, Github } from 'lucide-react'
import Image from 'next/image'

export default function ShowcasePage() {
  const projects = [
    {
      name: 'Flotilla',
      description: 'Full-stack distributed code hosting platform with production-ready Raft consensus algorithm, organization/team management, and real-time collaboration.',
      image: '/logo.svg',
      github: 'https://github.com/CPU-JIA/Cloud-Dev-Platform',
      demo: process.env.NEXT_PUBLIC_APP_URL || 'https://flotilla.dev',
      tags: ['Raft', 'NestJS', 'Next.js', 'TypeScript', 'PostgreSQL'],
      stats: { type: 'Core Platform' },
    },
    {
      name: 'Raft Consensus Engine',
      description: 'Production-grade Raft consensus implementation with 150ms automatic failover, leader election, log replication, and persistent storage. WebSocket-based inter-node communication.',
      image: '/images/raft-cluster-3nodes.png',
      github: 'https://github.com/CPU-JIA/Cloud-Dev-Platform/tree/main/apps/backend/src/raft',
      demo: `${process.env.NEXT_PUBLIC_APP_URL || 'https://flotilla.dev'}/raft`,
      tags: ['Raft', 'WebSocket', 'Distributed Systems'],
      stats: { type: 'Core Algorithm' },
    },
    {
      name: 'Organization & Team System',
      description: 'Enterprise-grade hierarchical permission system with organizations, teams, and project-level access control. Supports OWNER/ADMIN/MEMBER roles.',
      image: '/logo.svg',
      github: 'https://github.com/CPU-JIA/Cloud-Dev-Platform/tree/main/apps/backend/src/organizations',
      demo: `${process.env.NEXT_PUBLIC_APP_URL || 'https://flotilla.dev'}/organizations`,
      tags: ['RBAC', 'Prisma', 'Authorization'],
      stats: { type: 'Permission System' },
    },
    {
      name: 'Issue Tracking System',
      description: 'Complete issue management with labels, milestones, assignees, and comments. Markdown support with syntax highlighting. Real-time updates via WebSocket.',
      image: '/logo.svg',
      github: 'https://github.com/CPU-JIA/Cloud-Dev-Platform/tree/main/apps/backend/src/issues',
      demo: `${process.env.NEXT_PUBLIC_APP_URL || 'https://flotilla.dev'}/projects`,
      tags: ['Issues', 'Markdown', 'Real-time'],
      stats: { type: 'Collaboration Tool' },
    },
    {
      name: 'File Storage System',
      description: 'S3-compatible distributed object storage powered by MinIO. Automatic file versioning, metadata tracking, and access control integration.',
      image: '/logo.svg',
      github: 'https://github.com/CPU-JIA/Cloud-Dev-Platform/tree/main/apps/backend/src/files',
      demo: `${process.env.NEXT_PUBLIC_APP_URL || 'https://flotilla.dev'}/files`,
      tags: ['MinIO', 'S3', 'Object Storage'],
      stats: { type: 'Storage Layer' },
    },
    {
      name: 'Monitoring Dashboard',
      description: 'Real-time system metrics and Raft cluster visualization with React Flow topology graphs, performance charts via Recharts, and WebSocket live updates.',
      image: '/images/architecture-viz.png',
      github: 'https://github.com/CPU-JIA/Cloud-Dev-Platform/tree/main/apps/frontend/src/app/raft',
      demo: `${process.env.NEXT_PUBLIC_APP_URL || 'https://flotilla.dev'}/monitoring`,
      tags: ['React Flow', 'Recharts', 'WebSocket'],
      stats: { type: 'Observability' },
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
                <Image
                  src={project.image}
                  alt={project.name}
                  width={96}
                  height={96}
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
                  <div className="text-sm text-foreground/60">
                    <span className="font-medium">{project.stats.type}</span>
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
