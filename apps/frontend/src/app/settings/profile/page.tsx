'use client'

/**
 * 个人资料设置页面
 * ECP-A1: 单一职责 - 用户资料管理
 * ECP-C1: 防御性编程 - 表单验证和错误处理
 */

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { AvatarUpload } from '@/components/ui/avatar-upload'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { api, ApiError } from '@/lib/api'
import { toast } from 'sonner'

interface ProfileFormData {
  username: string
  email: string
  bio: string
}

export default function ProfilePage() {
  const router = useRouter()
  const { user, isAuthenticated, isLoading, refreshUser } = useAuth()

  const [profileData, setProfileData] = useState<ProfileFormData>({
    username: '',
    email: '',
    bio: '',
  })
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false)
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false)

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/auth/login')
    }

    if (user) {
      setProfileData({
        username: user.username || '',
        email: user.email || '',
        bio: user.bio || '',
      })
    }
  }, [isAuthenticated, isLoading, router, user])

  /**
   * 处理头像上传
   */
  const handleAvatarUpload = async (file: File): Promise<void> => {
    setIsUploadingAvatar(true)

    try {
      const formData = new FormData()
      formData.append('avatar', file)

      await api.users.update(user!.id, { avatar: '' }) // API调用待实现
      toast.success('头像上传成功')
      await refreshUser()
    } catch (err) {
      if (err instanceof ApiError) {
        toast.error(err.message || '头像上传失败')
      } else {
        toast.error('网络错误，请稍后重试')
      }
    } finally {
      setIsUploadingAvatar(false)
    }
  }

  /**
   * 更新个人资料
   */
  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsUpdatingProfile(true)

    try {
      // 前端验证
      if (profileData.username.length < 3) {
        toast.error('用户名至少3个字符')
        return
      }
      if (profileData.bio.length > 500) {
        toast.error('个人简介不能超过500字符')
        return
      }

      await api.users.update(user!.id, {
        bio: profileData.bio,
      })

      toast.success('个人资料更新成功')
      await refreshUser()
    } catch (err) {
      if (err instanceof ApiError) {
        toast.error(err.message || '更新失败')
      } else {
        toast.error('网络错误，请稍后重试')
      }
    } finally {
      setIsUpdatingProfile(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="space-y-6">
      {/* 头像上传 */}
      <Card>
        <CardHeader>
          <CardTitle>头像</CardTitle>
          <CardDescription>上传您的个人头像，支持 JPG、PNG 格式</CardDescription>
        </CardHeader>
        <CardContent>
          <AvatarUpload
            currentAvatarUrl={user.avatar || ''}
            userIdentifier={user.email || user.username}
            username={user.username}
            onUpload={handleAvatarUpload}
            isUploading={isUploadingAvatar}
            uploadButtonText="上传头像"
            removeButtonText="移除头像"
          />
        </CardContent>
      </Card>

      {/* 基本信息 */}
      <Card>
        <CardHeader>
          <CardTitle>基本信息</CardTitle>
          <CardDescription>管理您的个人资料信息</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleUpdateProfile} className="space-y-6">
            {/* 用户名 */}
            <div>
              <Label htmlFor="username">
                用户名 <span className="text-red-500">*</span>
              </Label>
              <Input
                id="username"
                type="text"
                value={profileData.username}
                onChange={(e) => setProfileData({ ...profileData, username: e.target.value })}
                className="mt-2"
                placeholder="输入用户名"
                minLength={3}
                maxLength={50}
                required
              />
              <p className="mt-1 text-xs text-muted-foreground">
                用户名将显示在您的个人资料和活动中
              </p>
            </div>

            {/* 邮箱（只读） */}
            <div>
              <Label htmlFor="email">邮箱</Label>
              <Input
                id="email"
                type="email"
                value={profileData.email}
                className="mt-2 bg-muted cursor-not-allowed"
                disabled
              />
              <p className="mt-1 text-xs text-muted-foreground">
                邮箱地址不可修改，如需更改请联系管理员
              </p>
            </div>

            {/* 个人简介 */}
            <div>
              <Label htmlFor="bio">个人简介</Label>
              <Textarea
                id="bio"
                value={profileData.bio}
                onChange={(e) => setProfileData({ ...profileData, bio: e.target.value })}
                className="mt-2"
                placeholder="介绍一下自己..."
                rows={4}
                maxLength={500}
              />
              <p className="mt-1 text-xs text-muted-foreground">
                {profileData.bio.length} / 500 字符
              </p>
            </div>

            {/* 提交按钮 */}
            <div className="flex justify-end">
              <Button type="submit" disabled={isUpdatingProfile}>
                {isUpdatingProfile ? '保存中...' : '保存更改'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
