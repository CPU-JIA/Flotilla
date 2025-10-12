'use client'

/**
 * 文件上传组件
 * ECP-A1: 单一职责 - 仅负责文件上传
 * ECP-C1: 防御性编程 - 文件类型和大小验证
 */

import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { Progress } from '@/components/ui/progress'
import { api, ApiError } from '@/lib/api'

interface FileUploadProps {
  projectId: string
  currentFolder: string
  onSuccess: () => void
}

const MAX_FILE_SIZE = 100 * 1024 * 1024 // 100MB

export function FileUpload({ projectId, currentFolder, onSuccess }: FileUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState('')

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return

    const file = acceptedFiles[0]

    // 文件大小验证
    if (file.size > MAX_FILE_SIZE) {
      setError(`文件大小不能超过 ${MAX_FILE_SIZE / 1024 / 1024}MB`)
      return
    }

    setUploading(true)
    setError('')
    setProgress(0)

    try {
      // 模拟进度（实际应该使用xhr或fetch with progress）
      const progressInterval = setInterval(() => {
        setProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval)
            return 90
          }
          return prev + 10
        })
      }, 200)

      await api.files.uploadFile(projectId, file, currentFolder)

      clearInterval(progressInterval)
      setProgress(100)

      setTimeout(() => {
        setUploading(false)
        setProgress(0)
        onSuccess()
      }, 500)
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message || '上传失败')
      } else {
        setError('网络错误，请稍后重试')
      }
      setUploading(false)
      setProgress(0)
    }
  }, [projectId, currentFolder, onSuccess])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    maxFiles: 1,
    disabled: uploading,
  })

  return (
    <div className="space-y-4">
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
          isDragActive
            ? 'border-blue-500 bg-blue-50'
            : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'
        } ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <input {...getInputProps()} />
        <div className="text-6xl mb-4">📤</div>
        {isDragActive ? (
          <p className="text-lg text-blue-600 font-medium">放开以上传文件...</p>
        ) : (
          <div>
            <p className="text-lg font-medium text-gray-900 mb-2">
              拖拽文件到此处或点击选择
            </p>
            <p className="text-sm text-gray-600">单个文件最大 100MB</p>
          </div>
        )}
      </div>

      {uploading && (
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-gray-600">
            <span>上传中...</span>
            <span>{progress}%</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-md text-sm">
          {error}
        </div>
      )}
    </div>
  )
}
