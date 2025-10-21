'use client'

import React, { useMemo } from 'react'
import {
  ReactFlow,
  Node,
  Edge,
  Background,
  Controls,
  MiniMap,
  NodeTypes,
  Position,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { RaftNodeStatus, NodeState } from '../hooks/useRaftCluster'

// ============================================
// Custom Node Component
// ============================================

interface NodeData extends Record<string, unknown> {
  label: string
  state: NodeState
  term: number
  isLeader: boolean
  commitIndex: number
  lastHeartbeat: string
}

function RaftNode({ data }: { data: NodeData }) {
  const stateColors: Record<NodeState, string> = {
    LEADER: 'bg-amber-500 border-amber-600 shadow-amber-500/50',
    FOLLOWER: 'bg-blue-500 border-blue-600 shadow-blue-500/50',
    CANDIDATE: 'bg-purple-500 border-purple-600 shadow-purple-500/50',
    OFFLINE: 'bg-gray-400 border-gray-500 shadow-gray-500/50',
  }

  const baseClasses = 'px-6 py-4 rounded-lg border-4 shadow-2xl transition-all duration-300'
  const stateClass = stateColors[data.state]
  const leaderGlow = data.isLeader ? 'ring-4 ring-amber-300 ring-opacity-75' : ''

  return (
    <div className={`${baseClasses} ${stateClass} ${leaderGlow}`}>
      <div className="text-white font-bold text-lg mb-2">{data.label}</div>
      <div className="text-white text-sm space-y-1">
        <div className="flex items-center gap-2">
          <span className="font-semibold">State:</span>
          <span className="px-2 py-0.5 bg-white/20 rounded">{data.state}</span>
        </div>
        <div>
          <span className="font-semibold">Term:</span> {data.term}
        </div>
        <div>
          <span className="font-semibold">Commit:</span> {data.commitIndex}
        </div>
        {data.isLeader && (
          <div className="mt-2 px-2 py-1 bg-amber-600 rounded text-xs font-bold text-center">
            👑 LEADER
          </div>
        )}
      </div>
    </div>
  )
}

const nodeTypes: NodeTypes = {
  raftNode: RaftNode,
}

// ============================================
// Main Component
// ============================================

interface ClusterTopologyProps {
  nodes: RaftNodeStatus[]
  leaderId: string | null
}

export default function ClusterTopology({ nodes, leaderId }: ClusterTopologyProps) {
  // Transform Raft node data to React Flow nodes
  const flowNodes: Node<NodeData>[] = useMemo(() => {
    return nodes.map((node, index) => {
      const positions = [
        { x: 250, y: 50 }, // Node 1 (top)
        { x: 100, y: 250 }, // Node 2 (bottom-left)
        { x: 400, y: 250 }, // Node 3 (bottom-right)
      ]

      return {
        id: node.nodeId,
        type: 'raftNode',
        position: positions[index] || { x: 250, y: 150 + index * 150 },
        data: {
          label: `Node ${node.nodeId}`,
          state: node.state,
          term: node.currentTerm,
          isLeader: node.isLeader,
          commitIndex: node.commitIndex,
          lastHeartbeat: node.lastHeartbeat,
        },
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
      }
    })
  }, [nodes])

  // Create edges connecting all nodes (full mesh for Raft)
  const flowEdges: Edge[] = useMemo(() => {
    const edges: Edge[] = []
    const nodeIds = nodes.map((n) => n.nodeId)

    for (let i = 0; i < nodeIds.length; i++) {
      for (let j = i + 1; j < nodeIds.length; j++) {
        // Bidirectional edges
        edges.push({
          id: `${nodeIds[i]}-${nodeIds[j]}`,
          source: nodeIds[i],
          target: nodeIds[j],
          animated: nodeIds[i] === leaderId || nodeIds[j] === leaderId,
          style: {
            stroke:
              leaderId && (nodeIds[i] === leaderId || nodeIds[j] === leaderId)
                ? '#f59e0b'
                : '#94a3b8',
            strokeWidth: 2,
          },
          type: 'smoothstep',
        })
      }
    }

    return edges
  }, [nodes, leaderId])

  return (
    <div className="w-full h-[500px] bg-gray-100 dark:bg-gray-900 rounded-lg border border-gray-300 dark:border-gray-700">
      <ReactFlow
        nodes={flowNodes}
        edges={flowEdges}
        nodeTypes={nodeTypes}
        fitView
        attributionPosition="bottom-left"
      >
        <Background />
        <Controls />
        <MiniMap
          nodeColor={(node) => {
            const data = node.data as NodeData
            switch (data.state) {
              case 'LEADER':
                return '#f59e0b'
              case 'FOLLOWER':
                return '#3b82f6'
              case 'CANDIDATE':
                return '#a855f7'
              default:
                return '#9ca3af'
            }
          }}
          maskColor="rgba(0, 0, 0, 0.2)"
        />
      </ReactFlow>
    </div>
  )
}
