'use client'

/**
 * 通知偏好设置页面
 * ECP-A1: 单一职责 - 管理用户通知偏好
 * ECP-C2: 系统化错误处理
 */

import { logger } from '@/lib/logger'
import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'
import { useLanguage } from '@/contexts/language-context'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { apiRequest } from '@/lib/api'
import { useToast } from '@/hooks/use-toast'
import { Bell, GitPullRequest, MessageCircle, AtSign, UserPlus, Mail, Save } from 'lucide-react'

interface NotificationPreferences {
  prCreated: boolean
  prMerged: boolean
  prReviewed: boolean
  prCommented: boolean
  issueMentioned: boolean
  issueAssigned: boolean
  issueCommented: boolean
  emailNotifications: boolean
}

const defaultPreferences: NotificationPreferences = {
  prCreated: true,
  prMerged: true,
  prReviewed: true,
  prCommented: true,
  issueMentioned: true,
  issueAssigned: true,
  issueCommented: true,
  emailNotifications: false,
}

export default function NotificationSettingsPage() {
  const router = useRouter()
  const { isAuthenticated, isLoading: authLoading } = useAuth()
  const { language } = useLanguage()
  const { toast } = useToast()

  const [preferences, setPreferences] = useState<NotificationPreferences>(defaultPreferences)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)
  const [originalPreferences, setOriginalPreferences] =
    useState<NotificationPreferences>(defaultPreferences)
  const hasFetched = useRef(false)

  const t = {
    title: language === 'zh' ? '通知偏好' : 'Notification Preferences',
    description:
      language === 'zh'
        ? '管理您希望接收的通知类型'
        : 'Manage which notifications you want to receive',
    prSection: language === 'zh' ? 'Pull Request 通知' : 'Pull Request Notifications',
    prSectionDesc:
      language === 'zh' ? '与 Pull Request 相关的通知' : 'Notifications related to Pull Requests',
    issueSection: language === 'zh' ? 'Issue 通知' : 'Issue Notifications',
    issueSectionDesc: language === 'zh' ? '与 Issue 相关的通知' : 'Notifications related to Issues',
    emailSection: language === 'zh' ? '邮件通知' : 'Email Notifications',
    emailSectionDesc: language === 'zh' ? '通过邮件接收通知' : 'Receive notifications via email',
    prCreated: language === 'zh' ? 'PR 创建通知' : 'PR Created',
    prCreatedDesc:
      language === 'zh'
        ? '当新的 Pull Request 创建时通知'
        : 'Notify when a new Pull Request is created',
    prMerged: language === 'zh' ? 'PR 合并通知' : 'PR Merged',
    prMergedDesc:
      language === 'zh' ? '当 Pull Request 被合并时通知' : 'Notify when a Pull Request is merged',
    prReviewed: language === 'zh' ? 'PR 审查通知' : 'PR Reviewed',
    prReviewedDesc:
      language === 'zh'
        ? '当 Pull Request 收到审查时通知'
        : 'Notify when a Pull Request receives a review',
    prCommented: language === 'zh' ? 'PR 评论通知' : 'PR Commented',
    prCommentedDesc:
      language === 'zh'
        ? '当 Pull Request 收到评论时通知'
        : 'Notify when a Pull Request receives a comment',
    issueMentioned: language === 'zh' ? '被提及时通知' : 'Mentioned',
    issueMentionedDesc:
      language === 'zh'
        ? '当您在 Issue 中被 @ 提及时通知'
        : 'Notify when you are @mentioned in an Issue',
    issueAssigned: language === 'zh' ? '被分配时通知' : 'Assigned',
    issueAssignedDesc:
      language === 'zh' ? '当 Issue 被分配给您时通知' : 'Notify when an Issue is assigned to you',
    issueCommented: language === 'zh' ? 'Issue 评论通知' : 'Issue Commented',
    issueCommentedDesc:
      language === 'zh'
        ? '当您关注的 Issue 收到评论时通知'
        : 'Notify when an Issue you watch receives a comment',
    emailEnabled: language === 'zh' ? '启用邮件通知' : 'Enable Email Notifications',
    emailEnabledDesc:
      language === 'zh'
        ? '除了站内通知外，还通过邮件发送通知'
        : 'Send notifications via email in addition to in-app',
    save: language === 'zh' ? '保存更改' : 'Save Changes',
    saving: language === 'zh' ? '保存中...' : 'Saving...',
    saved: language === 'zh' ? '已保存' : 'Saved',
    saveSuccess: language === 'zh' ? '通知偏好已更新' : 'Notification preferences updated',
    saveError: language === 'zh' ? '保存失败' : 'Failed to save',
    loadError: language === 'zh' ? '加载失败' : 'Failed to load',
  }

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push('/auth/login')
    }
  }, [isAuthenticated, authLoading, router])

  // 只在组件挂载且已认证时获取一次数据
  useEffect(() => {
    if (isAuthenticated && !hasFetched.current) {
      hasFetched.current = true
      const fetchPreferences = async () => {
        try {
          setLoading(true)
          const data = await apiRequest<NotificationPreferences>('/notifications/preferences/me')
          const prefs = { ...defaultPreferences, ...data }
          setPreferences(prefs)
          setOriginalPreferences(prefs)
        } catch (error) {
          logger.error('Failed to fetch preferences:', error)
          toast({
            title: language === 'zh' ? '加载失败' : 'Failed to load',
            variant: 'destructive',
          })
        } finally {
          setLoading(false)
        }
      }
      fetchPreferences()
    }
  }, [isAuthenticated]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const changed = Object.keys(preferences).some(
      (key) =>
        preferences[key as keyof NotificationPreferences] !==
        originalPreferences[key as keyof NotificationPreferences]
    )
    setHasChanges(changed)
  }, [preferences, originalPreferences])

  const handleToggle = (key: keyof NotificationPreferences) => {
    setPreferences((prev) => ({
      ...prev,
      [key]: !prev[key],
    }))
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      await apiRequest('/notifications/preferences/me', {
        method: 'PATCH',
        body: JSON.stringify(preferences),
      })
      setOriginalPreferences(preferences)
      setHasChanges(false)
      toast({
        title: t.saveSuccess,
      })
    } catch (error) {
      logger.error('Failed to save preferences:', error)
      toast({
        title: t.saveError,
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Bell className="h-6 w-6" />
            {t.title}
          </h2>
          <p className="text-muted-foreground mt-1">{t.description}</p>
        </div>
        <Button onClick={handleSave} disabled={!hasChanges || saving}>
          <Save className="h-4 w-4 mr-2" />
          {saving ? t.saving : t.save}
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Pull Request Notifications */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <GitPullRequest className="h-5 w-5 text-purple-500" />
                {t.prSection}
              </CardTitle>
              <CardDescription>{t.prSectionDesc}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>{t.prCreated}</Label>
                  <p className="text-sm text-muted-foreground">{t.prCreatedDesc}</p>
                </div>
                <Switch
                  checked={preferences.prCreated}
                  onCheckedChange={() => handleToggle('prCreated')}
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>{t.prMerged}</Label>
                  <p className="text-sm text-muted-foreground">{t.prMergedDesc}</p>
                </div>
                <Switch
                  checked={preferences.prMerged}
                  onCheckedChange={() => handleToggle('prMerged')}
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="flex items-center gap-2">
                    <MessageCircle className="h-4 w-4" />
                    {t.prReviewed}
                  </Label>
                  <p className="text-sm text-muted-foreground">{t.prReviewedDesc}</p>
                </div>
                <Switch
                  checked={preferences.prReviewed}
                  onCheckedChange={() => handleToggle('prReviewed')}
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>{t.prCommented}</Label>
                  <p className="text-sm text-muted-foreground">{t.prCommentedDesc}</p>
                </div>
                <Switch
                  checked={preferences.prCommented}
                  onCheckedChange={() => handleToggle('prCommented')}
                />
              </div>
            </CardContent>
          </Card>

          {/* Issue Notifications */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AtSign className="h-5 w-5 text-blue-500" />
                {t.issueSection}
              </CardTitle>
              <CardDescription>{t.issueSectionDesc}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="flex items-center gap-2">
                    <AtSign className="h-4 w-4" />
                    {t.issueMentioned}
                  </Label>
                  <p className="text-sm text-muted-foreground">{t.issueMentionedDesc}</p>
                </div>
                <Switch
                  checked={preferences.issueMentioned}
                  onCheckedChange={() => handleToggle('issueMentioned')}
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="flex items-center gap-2">
                    <UserPlus className="h-4 w-4" />
                    {t.issueAssigned}
                  </Label>
                  <p className="text-sm text-muted-foreground">{t.issueAssignedDesc}</p>
                </div>
                <Switch
                  checked={preferences.issueAssigned}
                  onCheckedChange={() => handleToggle('issueAssigned')}
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="flex items-center gap-2">
                    <MessageCircle className="h-4 w-4" />
                    {t.issueCommented}
                  </Label>
                  <p className="text-sm text-muted-foreground">{t.issueCommentedDesc}</p>
                </div>
                <Switch
                  checked={preferences.issueCommented}
                  onCheckedChange={() => handleToggle('issueCommented')}
                />
              </div>
            </CardContent>
          </Card>

          {/* Email Notifications */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5 text-green-500" />
                {t.emailSection}
              </CardTitle>
              <CardDescription>{t.emailSectionDesc}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>{t.emailEnabled}</Label>
                  <p className="text-sm text-muted-foreground">{t.emailEnabledDesc}</p>
                </div>
                <Switch
                  checked={preferences.emailNotifications}
                  onCheckedChange={() => handleToggle('emailNotifications')}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
