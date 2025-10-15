/**
 * Raft集群拓扑可视化组件
 *
 * 实时显示集群节点关系和状态
 * ECP-B2: KISS原则 - 简洁直观的可视化设计
 * ECP-A1: 单一职责 - 专注于拓扑展示
 */

'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Crown, Circle, Users } from 'lucide-react'

interface NodeState {
  nodeId: string
  state: 'LEADER' | 'FOLLOWER' | 'CANDIDATE'
  currentTerm: number
  logLength: number
  lastApplied: number
  isConnected?: boolean
}

interface ClusterTopologyProps {
  nodes: NodeState[]
  currentNodeId?: string
}

export function ClusterTopology({ nodes, currentNodeId }: ClusterTopologyProps) {
  const [animationKey, setAnimationKey] = useState(0)

  // 触发动画更新
  useEffect(() => {
    setAnimationKey(prev => prev + 1)
  }, [nodes])

  // 获取节点颜色和图标
  const getNodeStyle = (node: NodeState) => {
    const isCurrentNode = node.nodeId === currentNodeId

    switch (node.state) {
      case 'LEADER':
        return {
          bgColor: 'bg-blue-500',
          textColor: 'text-white',
          borderColor: isCurrentNode ? 'border-yellow-400 border-4' : 'border-blue-600',
          icon: <Crown className="w-6 h-6" />,
          pulse: true,
        }
      case 'FOLLOWER':
        return {
          bgColor: 'bg-green-500',
          textColor: 'text-white',
          borderColor: isCurrentNode ? 'border-yellow-400 border-4' : 'border-green-600',
          icon: <Circle className="w-6 h-6" />,
          pulse: false,
        }
      case 'CANDIDATE':
        return {
          bgColor: 'bg-yellow-500',
          textColor: 'text-black',
          borderColor: isCurrentNode ? 'border-yellow-400 border-4' : 'border-yellow-600',
          icon: <Users className="w-6 h-6" />,
          pulse: true,
        }
      default:
        return {
          bgColor: 'bg-gray-500',
          textColor: 'text-white',
          borderColor: 'border-gray-600',
          icon: <Circle className="w-6 h-6" />,
          pulse: false,
        }
    }
  }

  // 计算节点位置（圆形布局）
  const getNodePosition = (index: number, total: number) => {
    if (total === 1) {
      return { x: 50, y: 50 }
    }

    const angle = (2 * Math.PI * index) / total - Math.PI / 2
    const radius = 35 // 百分比
    const x = 50 + radius * Math.cos(angle)
    const y = 50 + radius * Math.sin(angle)

    return { x, y }
  }

  // 获取Leader节点
  const leader = nodes.find(node => node.state === 'LEADER')
  const followers = nodes.filter(node => node.state === 'FOLLOWER')
  const candidates = nodes.filter(node => node.state === 'CANDIDATE')

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="w-5 h-5" />
          集群拓扑
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative w-full h-96 bg-gray-50 dark:bg-gray-900 rounded-lg overflow-hidden">
          {/* 连接线 - 从Leader到所有Follower */}
          {leader && (
            <svg className="absolute inset-0 w-full h-full pointer-events-none">
              {followers.map((follower) => {
                const leaderPos = getNodePosition(
                  nodes.findIndex(n => n.nodeId === leader.nodeId),
                  nodes.length
                )
                const followerPos = getNodePosition(
                  nodes.findIndex(n => n.nodeId === follower.nodeId),
                  nodes.length
                )

                return (
                  <line
                    key={`connection-${follower.nodeId}`}
                    x1={`${leaderPos.x}%`}
                    y1={`${leaderPos.y}%`}
                    x2={`${followerPos.x}%`}
                    y2={`${followerPos.y}%`}
                    stroke="#3b82f6"
                    strokeWidth="2"
                    strokeDasharray="5,5"
                    className="animate-pulse"
                  />
                )
              })}
            </svg>
          )}

          {/* 节点 */}
          {nodes.map((node, index) => {
            const position = getNodePosition(index, nodes.length)
            const style = getNodeStyle(node)

            return (
              <div
                key={`node-${node.nodeId}-${animationKey}`}
                className={`absolute transform -translate-x-1/2 -translate-y-1/2 transition-all duration-500 ${
                  style.pulse ? 'animate-pulse' : ''
                }`}
                style={{
                  left: `${position.x}%`,
                  top: `${position.y}%`,
                }}
              >
                {/* 节点圆圈 */}
                <div
                  className={`w-20 h-20 rounded-full ${style.bgColor} ${style.borderColor} border-2
                             flex flex-col items-center justify-center cursor-pointer
                             hover:scale-110 transition-transform duration-200`}
                >
                  {style.icon}
                  <span className={`text-xs font-bold ${style.textColor} mt-1`}>
                    {node.nodeId}
                  </span>
                </div>

                {/* 节点状态信息 */}
                <div className="absolute top-full mt-2 left-1/2 transform -translate-x-1/2">
                  <div className="bg-white dark:bg-gray-800 rounded-lg p-2 shadow-lg border min-w-32">
                    <div className="text-center">
                      <Badge
                        variant="secondary"
                        className={`${style.bgColor} ${style.textColor} mb-1`}
                      >
                        {node.state}
                      </Badge>
                      <div className="text-xs space-y-1">
                        <div>任期: {node.currentTerm}</div>
                        <div>日志: {node.logLength}</div>
                        <div>已应用: {node.lastApplied}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}

          {/* 集群统计信息 */}
          <div className="absolute bottom-4 left-4 bg-white dark:bg-gray-800 rounded-lg p-3 shadow-lg border">
            <div className="text-sm space-y-1">
              <div className="font-semibold">集群统计</div>
              <div className="flex items-center gap-2">
                <Crown className="w-4 h-4 text-blue-500" />
                <span>Leader: {leader ? 1 : 0}</span>
              </div>
              <div className="flex items-center gap-2">
                <Circle className="w-4 h-4 text-green-500" />
                <span>Follower: {followers.length}</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-yellow-500" />
                <span>Candidate: {candidates.length}</span>
              </div>
            </div>
          </div>

          {/* 当前节点标识 */}
          {currentNodeId && (
            <div className="absolute top-4 right-4 bg-yellow-400 text-black rounded-lg p-2 shadow-lg">
              <div className="text-sm font-semibold">当前节点: {currentNodeId}</div>
            </div>
          )}

          {/* 无节点状态 */}
          {nodes.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center text-muted-foreground">
                <Circle className="w-12 h-12 mx-auto mb-2" />
                <div>暂无集群节点</div>
                <div className="text-sm">请启动Raft集群</div>
              </div>
            </div>
          )}
        </div>

        {/* 图例 */}
        <div className="mt-4 flex flex-wrap gap-4 text-sm">
          <div className="flex items-center gap-2">
            <Crown className="w-4 h-4 text-blue-500" />
            <span>Leader - 处理所有写请求</span>
          </div>
          <div className="flex items-center gap-2">
            <Circle className="w-4 h-4 text-green-500" />
            <span>Follower - 复制Leader日志</span>
          </div>
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-yellow-500" />
            <span>Candidate - 正在竞选Leader</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-1 bg-blue-500" style={{ clipPath: 'polygon(0 0, 100% 0, 100% 50%, 50% 100%, 0 50%)' }} />
            <span>心跳/日志复制连接</span>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}