'use client'

/**
 * 头像上传组件
 * ECP-A1: 单一职责 - 专注于头像显示和上传
 * ECP-C1: 防御性编程 - 文件类型和大小验证
 * ECP-D1: 可测试性设计 - 纯函数和清晰的状态管理
 */

import { useRef, useState } from 'react'
import { createAvatar } from '@dicebear/core'
import { adventurer } from '@dicebear/collection'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Upload, X, Camera } from 'lucide-react'

interface AvatarUploadProps {
  /** 当前用户头像URL（如果有） */
  currentAvatarUrl?: string
  /** 用户标识（用于生成默认头像，通常是username或email） */
  userIdentifier: string
  /** 用户名（显示在头像下方） */
  username: string
  /** 上传回调函数 */
  onUpload: (file: File) => Promise<void>
  /** 是否正在上传 */
  isUploading?: boolean
  /** 上传按钮文本 */
  uploadButtonText?: string
  /** 移除按钮文本 */
  removeButtonText?: string
}

/**
 * 生成默认头像SVG数据URL
 * ECP-B2: KISS原则 - 简单的默认头像生成
 */
function generateDefaultAvatar(seed: string): string {
  const avatar = createAvatar(adventurer, {
    seed,
    size: 128,
    backgroundColor: ['b6e3f4', 'c0aede', 'd1d4f9'],
  })

  const svg = avatar.toString()
  // 使用浏览器原生btoa进行base64编码
  return `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svg)))}`
}

export function AvatarUpload({
  currentAvatarUrl,
  userIdentifier,
  username,
  onUpload,
  isUploading = false,
  uploadButtonText = '上传头像',
  removeButtonText = '移除头像',
}: AvatarUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [uploadError, setUploadError] = useState<string>('')

  // 生成默认头像（基于userIdentifier的哈希）
  const defaultAvatarUrl = generateDefaultAvatar(userIdentifier)

  // 显示优先级：预览图 > 用户上传的头像 > 默认生成的头像
  const displayAvatarUrl = previewUrl || currentAvatarUrl || defaultAvatarUrl

  /**
   * 处理文件选择
   * ECP-C1: 防御性编程 - 严格的文件验证
   */
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploadError('')

    // 验证文件类型
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      setUploadError('仅支持 JPG、PNG、GIF、WebP 格式的图片')
      return
    }

    // 验证文件大小（最大5MB）
    const maxSize = 5 * 1024 * 1024 // 5MB
    if (file.size > maxSize) {
      setUploadError('图片大小不能超过 5MB')
      return
    }

    // 生成预览URL
    const reader = new FileReader()
    reader.onloadend = () => {
      setPreviewUrl(reader.result as string)
    }
    reader.readAsDataURL(file)

    // 调用上传回调
    try {
      await onUpload(file)
      setUploadError('')
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : '上传失败，请重试')
      setPreviewUrl(null) // 清除预览
    }
  }

  /**
   * 触发文件选择
   */
  const handleUploadClick = () => {
    fileInputRef.current?.click()
  }

  /**
   * 移除头像（恢复为默认头像）
   */
  const handleRemoveAvatar = () => {
    setPreviewUrl(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
    // 这里可以调用后端API删除头像
  }

  return (
    <div className="flex flex-col items-center space-y-4">
      {/* 头像显示区域 */}
      <div className="relative group">
        <Avatar className="h-32 w-32 ring-4 ring-border transition-all group-hover:ring-primary">
          <AvatarImage src={displayAvatarUrl} alt={`${username}的头像`} />
          <AvatarFallback className="text-2xl font-bold bg-gradient-to-br from-blue-400 to-purple-500 text-white">
            {username.slice(0, 2).toUpperCase()}
          </AvatarFallback>
        </Avatar>

        {/* 悬停时显示相机图标 */}
        <div
          className="absolute inset-0 bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"
          onClick={handleUploadClick}
        >
          <Camera className="h-8 w-8 text-white" />
        </div>
      </div>

      {/* 用户名显示 */}
      <div className="text-center">
        <p className="text-sm font-medium text-foreground">{username}</p>
        <p className="text-xs text-muted-foreground">
          {currentAvatarUrl ? '自定义头像' : '默认生成头像'}
        </p>
      </div>

      {/* 文件输入（隐藏） */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
        onChange={handleFileChange}
        className="hidden"
        disabled={isUploading}
      />

      {/* 操作按钮 */}
      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleUploadClick}
          disabled={isUploading}
        >
          <Upload className="h-4 w-4 mr-2" />
          {isUploading ? '上传中...' : uploadButtonText}
        </Button>

        {(currentAvatarUrl || previewUrl) && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleRemoveAvatar}
            disabled={isUploading}
          >
            <X className="h-4 w-4 mr-2" />
            {removeButtonText}
          </Button>
        )}
      </div>

      {/* 错误提示 */}
      {uploadError && (
        <div className="text-sm text-red-600 dark:text-red-400 text-center max-w-xs">
          ❌ {uploadError}
        </div>
      )}

      {/* 上传提示 */}
      <div className="text-xs text-muted-foreground text-center max-w-xs">
        支持 JPG、PNG、GIF、WebP 格式，最大 5MB
      </div>
    </div>
  )
}
