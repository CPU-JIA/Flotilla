'use client'

import { logger } from '@/lib/logger'
import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import { Loader2, Github, ExternalLink, Trash2 } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

interface OAuthAccount {
  id: string
  provider: 'github' | 'google'
  email: string
  displayName: string
  createdAt: string
}

export default function AccountsPage() {
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api/v1'

  const providerConfig = {
    github: {
      name: 'GitHub',
      icon: Github,
      color: 'bg-gray-900 text-white',
      linkUrl: `${API_URL}/auth/oauth/github/link`,
    },
    google: {
      name: 'Google',
      icon: () => (
        <svg className="w-5 h-5" viewBox="0 0 24 24">
          <path
            fill="#4285F4"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          />
          <path
            fill="#34A853"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          />
          <path
            fill="#FBBC05"
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
          />
          <path
            fill="#EA4335"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
          />
        </svg>
      ),
      color: 'bg-white text-gray-900 border',
      linkUrl: `${API_URL}/auth/oauth/google/link`,
    },
  }

  const [accounts, setAccounts] = useState<OAuthAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [unlinkingId, setUnlinkingId] = useState<string | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [accountToDelete, setAccountToDelete] = useState<OAuthAccount | null>(null)

  useEffect(() => {
    loadAccounts()
  }, [])

  const loadAccounts = async () => {
    try {
      setLoading(true)
      const response = await fetch(`${API_URL}/auth/oauth/accounts`, {
        credentials: 'include', // 🔒 自动发送 HttpOnly Cookie
      })

      if (!response.ok) {
        throw new Error('Failed to load accounts')
      }

      const data = await response.json()
      setAccounts(data)
    } catch (error) {
      toast.error('Failed to load linked accounts')
      logger.error(error)
    } finally {
      setLoading(false)
    }
  }

  const handleLink = (provider: 'github' | 'google') => {
    const config = providerConfig[provider]
    // 在新窗口打开OAuth授权
    const width = 600
    const height = 700
    const left = window.screen.width / 2 - width / 2
    const top = window.screen.height / 2 - height / 2

    const popup = window.open(
      config.linkUrl,
      'oauth',
      `width=${width},height=${height},top=${top},left=${left}`
    )

    // 监听popup关闭事件
    const timer = setInterval(() => {
      if (popup?.closed) {
        clearInterval(timer)
        loadAccounts() // 刷新账户列表
      }
    }, 500)
  }

  const handleUnlink = async (account: OAuthAccount) => {
    setAccountToDelete(account)
    setDeleteDialogOpen(true)
  }

  const confirmUnlink = async () => {
    if (!accountToDelete) return

    try {
      setUnlinkingId(accountToDelete.id)
      const response = await fetch(`${API_URL}/auth/oauth/unlink/${accountToDelete.provider}`, {
        method: 'DELETE',
        credentials: 'include', // 🔒 自动发送 HttpOnly Cookie
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Failed to unlink account')
      }

      toast.success(`${providerConfig[accountToDelete.provider].name} account unlinked`)
      await loadAccounts()
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to unlink account'
      toast.error(errorMessage)
      logger.error(error)
    } finally {
      setUnlinkingId(null)
      setDeleteDialogOpen(false)
      setAccountToDelete(null)
    }
  }

  const getLinkedProviders = () => {
    return accounts.map((acc) => acc.provider)
  }

  const linkedProviders = getLinkedProviders()

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="container max-w-4xl py-10">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Connected Accounts</h1>
          <p className="text-muted-foreground mt-2">
            Link your Flotilla account with external OAuth providers for easy sign-in
          </p>
        </div>

        <Separator />

        {/* Linked Accounts */}
        <Card>
          <CardHeader>
            <CardTitle>Linked Accounts</CardTitle>
            <CardDescription>
              You can sign in to Flotilla using any of these accounts
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {accounts.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">
                No accounts linked yet. Link an account below to enable OAuth login.
              </p>
            ) : (
              accounts.map((account) => {
                const config = providerConfig[account.provider]
                const Icon = config.icon
                return (
                  <div
                    key={account.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`p-2 rounded ${config.color}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="font-medium">{config.name}</div>
                        <div className="text-sm text-muted-foreground">{account.email}</div>
                        <div className="text-xs text-muted-foreground mt-1">
                          Linked {new Date(account.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleUnlink(account)}
                      disabled={unlinkingId === account.id}
                    >
                      {unlinkingId === account.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                )
              })
            )}
          </CardContent>
        </Card>

        {/* Available Providers */}
        <Card>
          <CardHeader>
            <CardTitle>Available Providers</CardTitle>
            <CardDescription>
              Link more accounts to enable additional sign-in methods
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {Object.entries(providerConfig).map(([provider, config]) => {
              const isLinked = linkedProviders.includes(provider as 'github' | 'google')
              const Icon = config.icon
              return (
                <div
                  key={provider}
                  className="flex items-center justify-between p-4 border rounded-lg"
                >
                  <div className="flex items-center gap-4">
                    <div className={`p-2 rounded ${config.color}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="font-medium">{config.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {isLinked ? 'Already linked' : 'Not linked'}
                      </div>
                    </div>
                  </div>
                  <Button
                    onClick={() => handleLink(provider as 'github' | 'google')}
                    disabled={isLinked}
                    variant={isLinked ? 'secondary' : 'default'}
                  >
                    {isLinked ? 'Linked' : 'Link Account'}
                    {!isLinked && <ExternalLink className="w-4 h-4 ml-2" />}
                  </Button>
                </div>
              )
            })}
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unlink Account?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to unlink your{' '}
              {accountToDelete && providerConfig[accountToDelete.provider].name} account? You
              won&apos;t be able to sign in using this account anymore.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmUnlink}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Unlink Account
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
