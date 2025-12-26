'use client'

import { useEffect } from 'react'
import { useCollaboration } from '@/hooks/useCollaboration'
import { CollaborationIndicator } from '@/components/collaboration/collaboration-indicator'
import * as _Y from 'yjs'

/**
 * CodeEditorWithCollaboration 组件示例
 *
 * 展示如何集成实时协作编辑到代码编辑器中
 *
 * ECP-A2: 高内聚低耦合 - 使用useCollaboration Hook封装协作逻辑
 * ECP-D2: 注释最佳实践 - 注释使用方法而非实现细节
 *
 * 使用步骤：
 * 1. 在编辑器组件中调用 useCollaboration Hook
 * 2. 监听 Yjs 文档变更
 * 3. 将编辑器内容变更转换为 Yjs 更新
 * 4. 使用 CollaborationIndicator 显示协作用户
 *
 * 示例：
 * ```tsx
 * function CodeEditor({ filePath, projectId }: Props) {
 *   const { connected, activeUsers, yourColor, ydoc, sendUpdate } = useCollaboration({
 *     documentId: filePath,
 *     projectId,
 *     documentType: 'file',
 *     onUpdate: (update) => {
 *       // 将更新应用到编辑器
 *     },
 *   })
 *
 *   // 监听编辑器变更
 *   const handleEditorChange = (value: string) => {
 *     if (!ydoc) return
 *
 *     // 将编辑器内容转换为 Yjs 更新
 *     const ytext = ydoc.getText('content')
 *     ydoc.transact(() => {
 *       ytext.delete(0, ytext.length)
 *       ytext.insert(0, value)
 *     }, 'local')
 *   }
 *
 *   // 监听 Yjs 文档变更
 *   useEffect(() => {
 *     if (!ydoc) return
 *
 *     const ytext = ydoc.getText('content')
 *     const observer = () => {
 *       const content = ytext.toString()
 *       // 更新编辑器内容
 *       setEditorValue(content)
 *     }
 *
 *     ytext.observe(observer)
 *     return () => ytext.unobserve(observer)
 *   }, [ydoc])
 *
 *   return (
 *     <div>
 *       <CollaborationIndicator
 *         activeUsers={activeUsers}
 *         yourColor={yourColor}
 *         connected={connected}
 *       />
 *       <MonacoEditor
 *         value={editorValue}
 *         onChange={handleEditorChange}
 *       />
 *     </div>
 *   )
 * }
 * ```
 */

export interface CodeEditorWithCollaborationProps {
  filePath: string
  projectId: string
  initialContent?: string
  language?: string
  readOnly?: boolean
}

/**
 * 带协作功能的代码编辑器组件示例
 *
 * 注意：这是一个示例组件，展示如何集成协作功能
 * 实际使用时需要根据具体的编辑器实现进行调整
 */
export function CodeEditorWithCollaboration({
  filePath,
  projectId,
  initialContent = '',
  language = 'typescript',
  readOnly = false,
}: CodeEditorWithCollaborationProps) {
  const {
    connected,
    activeUsers,
    yourColor,
    ydoc,
    sendUpdate,
    sendAwareness: _sendAwareness,
  } = useCollaboration({
    documentId: filePath,
    projectId,
    documentType: 'file',
    enabled: !readOnly,
    onUserJoined: (user) => {
      console.log('User joined:', user)
    },
    onUserLeft: (userId) => {
      console.log('User left:', userId)
    },
    onUpdate: (update) => {
      console.log('Received update:', update)
    },
    onError: (error) => {
      console.error('Collaboration error:', error)
    },
  })

  // 初始化 Yjs 文档内容
  useEffect(() => {
    if (!ydoc || !initialContent) return

    const ytext = ydoc.getText('content')
    if (ytext.length === 0) {
      ydoc.transact(() => {
        ytext.insert(0, initialContent)
      }, 'init')
    }
  }, [ydoc, initialContent])

  // 监听 Yjs 文档变更并发送更新
  useEffect(() => {
    if (!ydoc) return

    const updateHandler = (update: Uint8Array, origin: unknown) => {
      // 只发送本地变更，不发送从远程接收的变更
      if (origin !== 'remote') {
        sendUpdate(update)
      }
    }

    ydoc.on('update', updateHandler)
    return () => ydoc.off('update', updateHandler)
  }, [ydoc, sendUpdate])

  return (
    <div className="flex flex-col gap-2 h-full">
      {!readOnly && (
        <CollaborationIndicator
          activeUsers={activeUsers}
          yourColor={yourColor}
          connected={connected}
        />
      )}

      <div className="flex-1 border rounded-lg overflow-hidden">
        {/* 这里集成实际的代码编辑器（Monaco、CodeMirror等） */}
        <div className="p-4 text-sm text-muted-foreground">
          <p>Integration Example:</p>
          <ul className="list-disc list-inside mt-2 space-y-1">
            <li>File: {filePath}</li>
            <li>Project: {projectId}</li>
            <li>Connected: {connected ? 'Yes' : 'No'}</li>
            <li>Active Users: {activeUsers.length}</li>
            <li>Language: {language}</li>
          </ul>
        </div>
      </div>
    </div>
  )
}

/**
 * 使用 Monaco Editor 的完整示例
 *
 * 需要安装：@monaco-editor/react
 *
 * ```tsx
 * import Editor from '@monaco-editor/react'
 *
 * export function MonacoWithCollaboration(props: CodeEditorWithCollaborationProps) {
 *   const [editorValue, setEditorValue] = useState(props.initialContent)
 *   const { ydoc, sendUpdate, ...rest } = useCollaboration({...})
 *
 *   useEffect(() => {
 *     if (!ydoc) return
 *     const ytext = ydoc.getText('content')
 *
 *     const observer = () => {
 *       setEditorValue(ytext.toString())
 *     }
 *
 *     ytext.observe(observer)
 *     return () => ytext.unobserve(observer)
 *   }, [ydoc])
 *
 *   const handleChange = (value: string | undefined) => {
 *     if (!ydoc || !value) return
 *
 *     const ytext = ydoc.getText('content')
 *     ydoc.transact(() => {
 *       ytext.delete(0, ytext.length)
 *       ytext.insert(0, value)
 *     }, 'local')
 *   }
 *
 *   return (
 *     <div>
 *       <CollaborationIndicator {...rest} />
 *       <Editor
 *         value={editorValue}
 *         onChange={handleChange}
 *         language={props.language}
 *       />
 *     </div>
 *   )
 * }
 * ```
 */
