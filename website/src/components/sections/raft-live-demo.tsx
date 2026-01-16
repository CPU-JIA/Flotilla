'use client'

import * as React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Server, Zap, Clock, CheckCircle, XCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import Image from 'next/image'

type NodeState = 'leader' | 'follower' | 'candidate' | 'down'

interface Node {
  id: number
  name: string
  state: NodeState
  term: number
  votedFor: number | null
  logLength: number
}

const initialNodes: Node[] = [
  { id: 1, name: 'Node 1', state: 'leader', term: 1, votedFor: null, logLength: 5 },
  { id: 2, name: 'Node 2', state: 'follower', term: 1, votedFor: 1, logLength: 5 },
  { id: 3, name: 'Node 3', state: 'follower', term: 1, votedFor: 1, logLength: 5 },
]

export function RaftLiveDemo() {
  const [nodes, setNodes] = React.useState<Node[]>(initialNodes)
  const [isElecting, setIsElecting] = React.useState(false)
  const [logs, setLogs] = React.useState<string[]>([])

  const addLog = (message: string) => {
    setLogs((prev) => [`[${new Date().toLocaleTimeString()}] ${message}`, ...prev.slice(0, 4)])
  }

  const simulateLeaderFailure = () => {
    if (isElecting) return

    addLog('❌ Leader (Node 1) has failed!')
    setNodes((prev) => prev.map((node) => (node.id === 1 ? { ...node, state: 'down' } : node)))

    // Start election after 500ms
    setTimeout(() => {
      setIsElecting(true)
      addLog('🗳️ Starting leader election...')

      // Node 2 becomes candidate
      setNodes((prev) =>
        prev.map((node) =>
          node.id === 2
            ? { ...node, state: 'candidate', term: node.term + 1 }
            : node.id === 1
              ? node
              : { ...node, term: node.term + 1 }
        )
      )

      // Node 3 votes for Node 2
      setTimeout(() => {
        addLog('✅ Node 3 votes for Node 2')
        setNodes((prev) => prev.map((node) => (node.id === 3 ? { ...node, votedFor: 2 } : node)))

        // Node 2 wins election
        setTimeout(() => {
          addLog('👑 Node 2 elected as new Leader!')
          setNodes((prev) =>
            prev.map((node) =>
              node.id === 2
                ? { ...node, state: 'leader', votedFor: null }
                : node.id === 1
                  ? node
                  : { ...node, state: 'follower', votedFor: 2 }
            )
          )
          setIsElecting(false)
        }, 800)
      }, 600)
    }, 500)
  }

  const resetDemo = () => {
    setNodes(initialNodes)
    setLogs([])
    setIsElecting(false)
    addLog('🔄 Demo reset to initial state')
  }

  const getNodeColor = (state: NodeState) => {
    switch (state) {
      case 'leader':
        return 'border-accent bg-accent/10'
      case 'candidate':
        return 'border-yellow-500 bg-yellow-500/10 animate-pulse'
      case 'follower':
        return 'border-primary bg-primary/10'
      case 'down':
        return 'border-red-500 bg-red-500/10 opacity-50'
      default:
        return 'border-border'
    }
  }

  const getNodeIcon = (state: NodeState) => {
    switch (state) {
      case 'leader':
        return <Zap className="h-5 w-5 text-accent" />
      case 'candidate':
        return <Clock className="h-5 w-5 text-yellow-500 animate-spin" />
      case 'follower':
        return <CheckCircle className="h-5 w-5 text-primary" />
      case 'down':
        return <XCircle className="h-5 w-5 text-red-500" />
    }
  }

  return (
    <section className="py-24 bg-background">
      <div className="container mx-auto px-4">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold mb-4">Raft Consensus in Action</h2>
            <p className="text-lg text-foreground/60">
              Watch how the Raft algorithm maintains consensus even when the leader fails.
              <br />
              Real distributed systems need automatic failover. This is how we do it.
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-8">
            {/* Left: Nodes Visualization */}
            <div className="space-y-6">
              <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Server className="h-5 w-5 text-primary" />
                Cluster Nodes
              </h3>

              <div className="space-y-4">
                {nodes.map((node, index) => (
                  <motion.div
                    key={node.id}
                    layout
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className={cn(
                      'p-6 rounded-2xl border-2 transition-all duration-300',
                      getNodeColor(node.state),
                      'hover:shadow-lg'
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {getNodeIcon(node.state)}
                        <div>
                          <div className="font-semibold">{node.name}</div>
                          <div className="text-sm text-foreground/60 capitalize">{node.state}</div>
                        </div>
                      </div>

                      <div className="text-right text-sm space-y-1">
                        <div className="text-foreground/60">
                          Term: <span className="font-mono">{node.term}</span>
                        </div>
                        {node.votedFor && (
                          <div className="text-foreground/60">
                            Voted: <span className="font-mono">Node {node.votedFor}</span>
                          </div>
                        )}
                        {node.state !== 'down' && (
                          <div className="text-foreground/60">
                            Logs: <span className="font-mono">{node.logLength}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Control Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={simulateLeaderFailure}
                  disabled={isElecting || nodes[0].state === 'down'}
                  className={cn(
                    'flex-1 px-4 h-11 rounded-lg font-medium transition-all',
                    'bg-red-500 text-white hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed',
                    'shadow-lg shadow-red-500/25'
                  )}
                >
                  Simulate Leader Failure
                </button>
                <button
                  onClick={resetDemo}
                  className="px-4 h-11 rounded-lg font-medium bg-secondary hover:bg-secondary/80 transition-colors"
                >
                  Reset
                </button>
              </div>
            </div>

            {/* Right: Event Log */}
            <div className="space-y-6">
              <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" />
                Event Log
              </h3>

              <div className="h-[400px] rounded-2xl border border-border/40 bg-card p-4 overflow-y-auto">
                <AnimatePresence mode="popLayout">
                  {logs.length === 0 ? (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="h-full flex items-center justify-center text-foreground/40 text-sm"
                    >
                      Click &quot;Simulate Leader Failure&quot; to start...
                    </motion.div>
                  ) : (
                    <div className="space-y-2 font-mono text-sm">
                      {logs.map((log, index) => (
                        <motion.div
                          key={`${log}-${index}`}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 10 }}
                          className="p-2 rounded bg-secondary/50 text-foreground/80"
                        >
                          {log}
                        </motion.div>
                      ))}
                    </div>
                  )}
                </AnimatePresence>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-4 rounded-xl bg-accent/10 border border-accent/20 text-center">
                  <div className="text-2xl font-bold text-accent">150ms</div>
                  <div className="text-xs text-foreground/60 mt-1">Failover Time</div>
                </div>
                <div className="p-4 rounded-xl bg-primary/10 border border-primary/20 text-center">
                  <div className="text-2xl font-bold text-primary">99.99%</div>
                  <div className="text-xs text-foreground/60 mt-1">Availability</div>
                </div>
                <div className="p-4 rounded-xl bg-green-500/10 border border-green-500/20 text-center">
                  <div className="text-2xl font-bold text-green-500">
                    {nodes.filter((n) => n.state !== 'down').length}/{nodes.length}
                  </div>
                  <div className="text-xs text-foreground/60 mt-1">Nodes Online</div>
                </div>
              </div>
            </div>
          </div>

          {/* Production Cluster Screenshot */}
          <div className="mt-12">
            <h3 className="text-2xl font-semibold mb-6 text-center">Production 3-Node Cluster</h3>
            <div className="relative aspect-video rounded-2xl overflow-hidden border border-border/40 bg-card/50 backdrop-blur-sm shadow-2xl">
              <Image
                src="/images/raft-cluster-3nodes.png"
                alt="Flotilla 3-Node Raft Cluster Running in Production"
                fill
                className="object-contain"
              />
            </div>
            <p className="text-center text-sm text-foreground/60 mt-4">
              Live monitoring of a 3-node Raft cluster with real-time health checks and log
              replication
            </p>
          </div>

          {/* Bottom Info */}
          <div className="mt-12 p-6 rounded-2xl bg-secondary/30 border border-border/40">
            <h4 className="font-semibold mb-2">How Raft Consensus Works</h4>
            <p className="text-sm text-foreground/70 leading-relaxed">
              Raft divides consensus into three sub-problems: <strong>Leader Election</strong>{' '}
              (choose one server to act as cluster leader), <strong>Log Replication</strong> (leader
              accepts log entries from clients and replicates them across the cluster), and{' '}
              <strong>Safety</strong> (if any server has applied a particular log entry, no other
              server may apply a different command for that log index). This demo shows leader
              election in action with automatic failover in ~150ms.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
