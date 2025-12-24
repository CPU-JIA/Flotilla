'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import { Loader2, Shield, CheckCircle2, XCircle, Copy, Eye, EyeOff } from 'lucide-react'
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
import Image from 'next/image'

interface Setup2FAResponse {
  qrCode: string
  secret: string
}

export default function TwoFactorPage() {
  const [is2FAEnabled, setIs2FAEnabled] = useState(false)
  const [loading, setLoading] = useState(true)
  const [setupMode, setSetupMode] = useState(false)
  const [qrCode, setQrCode] = useState('')
  const [secret, setSecret] = useState('')
  const [verificationCode, setVerificationCode] = useState('')
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([])
  const [showRecoveryCodes, setShowRecoveryCodes] = useState(false)
  const [disableDialogOpen, setDisableDialogOpen] = useState(false)
  const [disableCode, setDisableCode] = useState('')
  const [processing, setProcessing] = useState(false)

  useEffect(() => {
    check2FAStatus()
  }, [])

  const check2FAStatus = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/auth/2fa/status', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
        },
      })

      if (!response.ok) {
        throw new Error('Failed to check 2FA status')
      }

      const data = await response.json()
      setIs2FAEnabled(data.enabled)
    } catch (error) {
      toast.error('Failed to load 2FA status')
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const startSetup = async () => {
    try {
      setProcessing(true)
      const response = await fetch('/api/auth/2fa/setup', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        throw new Error('Failed to generate 2FA secret')
      }

      const data: Setup2FAResponse = await response.json()
      setQrCode(data.qrCode)
      setSecret(data.secret)
      setSetupMode(true)
    } catch (error) {
      toast.error('Failed to start 2FA setup')
      console.error(error)
    } finally {
      setProcessing(false)
    }
  }

  const enable2FA = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      toast.error('Please enter a valid 6-digit code')
      return
    }

    try {
      setProcessing(true)
      const response = await fetch('/api/auth/2fa/enable', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          secret,
          token: verificationCode,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Invalid verification code')
      }

      const data = await response.json()
      setRecoveryCodes(data.recoveryCodes)
      setShowRecoveryCodes(true)
      setIs2FAEnabled(true)
      setSetupMode(false)
      toast.success('2FA enabled successfully! Save your recovery codes.')
    } catch (error: any) {
      toast.error(error.message || 'Failed to enable 2FA')
      console.error(error)
    } finally {
      setProcessing(false)
    }
  }

  const disable2FA = async () => {
    if (!disableCode || disableCode.length !== 6) {
      toast.error('Please enter a valid 6-digit code')
      return
    }

    try {
      setProcessing(true)
      const response = await fetch('/api/auth/2fa/disable', {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${localStorage.getItem('accessToken')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token: disableCode,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.message || 'Invalid verification code')
      }

      setIs2FAEnabled(false)
      setDisableDialogOpen(false)
      setDisableCode('')
      toast.success('2FA disabled successfully')
    } catch (error: any) {
      toast.error(error.message || 'Failed to disable 2FA')
      console.error(error)
    } finally {
      setProcessing(false)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast.success('Copied to clipboard')
  }

  const downloadRecoveryCodes = () => {
    const content = `Flotilla Two-Factor Authentication Recovery Codes\n\nGenerated: ${new Date().toLocaleString()}\n\n${recoveryCodes.join('\n')}\n\n⚠️ IMPORTANT: Save these codes in a secure location. Each code can only be used once.`
    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `flotilla-recovery-codes-${Date.now()}.txt`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Recovery codes downloaded')
  }

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
          <h1 className="text-3xl font-bold">Two-Factor Authentication</h1>
          <p className="text-muted-foreground mt-2">
            Add an extra layer of security to your account
          </p>
        </div>

        <Separator />

        {/* Status Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>2FA Status</CardTitle>
                <CardDescription>
                  Two-factor authentication {is2FAEnabled ? 'is' : 'is not'} enabled for your account
                </CardDescription>
              </div>
              <div>
                {is2FAEnabled ? (
                  <Badge className="bg-green-500"><CheckCircle2 className="w-4 h-4 mr-1" />Enabled</Badge>
                ) : (
                  <Badge variant="secondary"><XCircle className="w-4 h-4 mr-1" />Disabled</Badge>
                )}
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Setup or Disable */}
        {!is2FAEnabled && !setupMode && (
          <Card>
            <CardHeader>
              <CardTitle>Enable Two-Factor Authentication</CardTitle>
              <CardDescription>
                Use an authenticator app like Google Authenticator or Authy to generate verification codes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={startSetup} disabled={processing}>
                {processing && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                <Shield className="w-4 h-4 mr-2" />
                Enable 2FA
              </Button>
            </CardContent>
          </Card>
        )}

        {setupMode && (
          <>
            <Card>
              <CardHeader>
                <CardTitle>Step 1: Scan QR Code</CardTitle>
                <CardDescription>
                  Scan this QR code with your authenticator app
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-center p-4 bg-white rounded-lg">
                  {qrCode && (
                    <Image
                      src={qrCode}
                      alt="2FA QR Code"
                      width={256}
                      height={256}
                      className="rounded"
                    />
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Or enter this code manually:</Label>
                  <div className="flex gap-2">
                    <Input
                      value={secret}
                      readOnly
                      className="font-mono text-sm"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => copyToClipboard(secret)}
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Step 2: Verify Code</CardTitle>
                <CardDescription>
                  Enter the 6-digit code from your authenticator app
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="verificationCode">Verification Code</Label>
                  <Input
                    id="verificationCode"
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="000000"
                    maxLength={6}
                    className="text-center text-2xl font-mono tracking-widest"
                  />
                </div>
                <div className="flex gap-2">
                  <Button onClick={enable2FA} disabled={processing || verificationCode.length !== 6}>
                    {processing && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                    Enable 2FA
                  </Button>
                  <Button variant="outline" onClick={() => setSetupMode(false)} disabled={processing}>
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          </>
        )}

        {showRecoveryCodes && recoveryCodes.length > 0 && (
          <Card className="border-yellow-500">
            <CardHeader>
              <CardTitle className="text-yellow-600">⚠️ Save Your Recovery Codes</CardTitle>
              <CardDescription>
                Store these codes in a safe place. Each code can only be used once to access your account if you lose your authenticator.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-2 p-4 bg-muted rounded font-mono text-sm">
                {recoveryCodes.map((code, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-background rounded">
                    <span>{code}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => copyToClipboard(code)}
                    >
                      <Copy className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <Button onClick={downloadRecoveryCodes}>
                  Download Codes
                </Button>
                <Button variant="outline" onClick={() => setShowRecoveryCodes(false)}>
                  I've Saved My Codes
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {is2FAEnabled && !showRecoveryCodes && (
          <Card>
            <CardHeader>
              <CardTitle>Disable Two-Factor Authentication</CardTitle>
              <CardDescription>
                Remove 2FA protection from your account
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                variant="destructive"
                onClick={() => setDisableDialogOpen(true)}
              >
                Disable 2FA
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      <AlertDialog open={disableDialogOpen} onOpenChange={setDisableDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Disable Two-Factor Authentication?</AlertDialogTitle>
            <AlertDialogDescription>
              This will make your account less secure. Enter your current 2FA code to confirm.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="my-4">
            <Label htmlFor="disableCode">Verification Code</Label>
            <Input
              id="disableCode"
              value={disableCode}
              onChange={(e) => setDisableCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000"
              maxLength={6}
              className="text-center text-2xl font-mono tracking-widest mt-2"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDisableCode('')}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={disable2FA}
              disabled={processing || disableCode.length !== 6}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {processing && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Disable 2FA
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
