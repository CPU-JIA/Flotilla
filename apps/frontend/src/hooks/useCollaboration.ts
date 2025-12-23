'use client'

import { useEffect, useState, useCallback, useRef } from 'react'
import { io, Socket } from 'socket.io-client'
import * as Y from 'yjs'

/**
 * 协作用户接口
 */
export interface CollaborationUser {
  id: string
  username: string
  avatar: string | null
  color: string
  cursor?: {
    line: number
    column: number
  }
  selection?: {
    start: any
    end: any
  }
}

/**
 * useCollaboration Hook 选项
 */
export interface UseCollaborationOptions {
  documentId: string
  projectId: string
  documentType: 'file' | 'wiki'
  enabled?: boolean
  onUserJoined?: (user: CollaborationUser) => void
  onUserLeft?: (userId: string) => void
  onUpdate?: (update: Uint8Array) => void
  onError?: (error: Error) => void
}

/**
 * useCollaboration Hook 返回值
 */
export interface UseCollaborationReturn {
  connected: boolean
  activeUsers: CollaborationUser[]
  yourColor: string | null
  ydoc: Y.Doc | null
  sendUpdate: (update: Uint8Array) => void
  sendAwareness: (state: {
    cursor?: { line: number; column: number }
    selection?: { start: any; end: any }
  }) => void
  disconnect: () => void
}

/**
 * 实时协作编辑 Hook
 *
 * ECP-A2: 高内聚低耦合 - 封装所有协作逻辑到单个Hook
 * ECP-C1: 防御性编程 - 处理连接错误和异常
 * ECP-C2: 系统性错误处理 - 提供onError回调
 *
 * 使用示例：
 * ```tsx
 * const { connected, activeUsers, sendUpdate } = useCollaboration({
 *   documentId: 'README.md',
 *   projectId: 'project-123',
 *   documentType: 'file',
 *   onUserJoined: (user) => console.log('User joined:', user),
 * })
 * ```
 */
export function useCollaboration(
  options: UseCollaborationOptions,
): UseCollaborationReturn {
  const {
    documentId,
    projectId,
    documentType,
    enabled = true,
    onUserJoined,
    onUserLeft,
    onUpdate,
    onError,
  } = options

  const [connected, setConnected] = useState(false)
  const [activeUsers, setActiveUsers] = useState<CollaborationUser[]>([])
  const [yourColor, setYourColor] = useState<string | null>(null)
  const [ydoc, setYdoc] = useState<Y.Doc | null>(null)

  const socketRef = useRef<Socket | null>(null)
  const sessionIdRef = useRef<string | null>(null)

  /**
   * 初始化连接
   */
  useEffect(() => {
    if (!enabled || !documentId || !projectId) {
      return
    }

    // 获取认证token
    const token = localStorage.getItem('token')
    if (!token) {
      onError?.(new Error('No authentication token found'))
      return
    }

    // 创建 Yjs 文档
    const doc = new Y.Doc()
    setYdoc(doc)

    // 连接到 WebSocket
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'
    const socket = io(`${API_URL}/collaboration`, {
      query: { token },
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    })

    socketRef.current = socket

    // 连接成功
    socket.on('connected', (data) => {
      console.log('Connected to collaboration service:', data)
      setConnected(true)

      // 加入文档
      socket.emit(
        'join-document',
        {
          documentId,
          projectId,
          documentType,
        },
        (response: any) => {
          if (response.event === 'document-joined') {
            sessionIdRef.current = response.data.sessionId
            setActiveUsers(response.data.activeUsers)
            setYourColor(response.data.yourColor)
            console.log('Joined document:', response.data)
          } else if (response.event === 'error') {
            onError?.(new Error(response.data.message))
          }
        },
      )
    })

    // 连接错误
    socket.on('connect_error', (error) => {
      console.error('Connection error:', error)
      setConnected(false)
      onError?.(error)
    })

    // 断开连接
    socket.on('disconnect', () => {
      console.log('Disconnected from collaboration service')
      setConnected(false)
    })

    // 用户加入
    socket.on('user-joined', (data: { user: CollaborationUser }) => {
      console.log('User joined:', data.user)
      setActiveUsers((prev) => [...prev, data.user])
      onUserJoined?.(data.user)
    })

    // 用户离开
    socket.on('user-left', (data: { userId: string }) => {
      console.log('User left:', data.userId)
      setActiveUsers((prev) => prev.filter((u) => u.id !== data.userId))
      onUserLeft?.(data.userId)
    })

    // 接收 CRDT 更新
    socket.on(
      'sync-update',
      (data: { update: number[]; senderId: string }) => {
        try {
          const updateArray = new Uint8Array(data.update)
          Y.applyUpdate(doc, updateArray)
          onUpdate?.(updateArray)
        } catch (error) {
          console.error('Error applying update:', error)
          onError?.(error as Error)
        }
      },
    )

    // 接收用户状态更新
    socket.on(
      'awareness-update',
      (data: {
        userId: string
        state: {
          cursor?: { line: number; column: number }
          selection?: { start: any; end: any }
        }
      }) => {
        setActiveUsers((prev) =>
          prev.map((user) =>
            user.id === data.userId
              ? {
                  ...user,
                  cursor: data.state.cursor,
                  selection: data.state.selection,
                }
              : user,
          ),
        )
      },
    )

    // 清理函数
    return () => {
      if (socket.connected) {
        socket.emit('leave-document', { documentId })
      }
      socket.disconnect()
      doc.destroy()
    }
  }, [
    enabled,
    documentId,
    projectId,
    documentType,
    onUserJoined,
    onUserLeft,
    onUpdate,
    onError,
  ])

  /**
   * 发送 CRDT 更新
   */
  const sendUpdate = useCallback(
    (update: Uint8Array) => {
      if (!socketRef.current || !connected) {
        console.warn('Socket not connected, update not sent')
        return
      }

      socketRef.current.emit(
        'sync-update',
        {
          documentId,
          update: Array.from(update),
        },
        (response: any) => {
          if (response.event === 'error') {
            onError?.(new Error(response.data.message))
          }
        },
      )
    },
    [connected, documentId, onError],
  )

  /**
   * 发送用户状态（光标、选区）
   */
  const sendAwareness = useCallback(
    (state: {
      cursor?: { line: number; column: number }
      selection?: { start: any; end: any }
    }) => {
      if (!socketRef.current || !connected) {
        return
      }

      socketRef.current.emit('awareness-update', {
        documentId,
        state,
      })
    },
    [connected, documentId],
  )

  /**
   * 手动断开连接
   */
  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.emit('leave-document', { documentId })
      socketRef.current.disconnect()
    }
  }, [documentId])

  return {
    connected,
    activeUsers,
    yourColor,
    ydoc,
    sendUpdate,
    sendAwareness,
    disconnect,
  }
}
