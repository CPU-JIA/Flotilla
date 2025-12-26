/**
 * Privacy & GDPR Data Export Page
 */

'use client'

import { useState } from 'react'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Download, AlertTriangle, Shield, Trash2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

export default function PrivacyPage() {
  const [exporting, setExporting] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const handleExportData = async () => {
    if (!confirm(`Request data export?\n\nYou will receive an email with a download link when your data is ready.`)) return

    try {
      setExporting(true)
      await api.post('/gdpr/export', {})
      alert(`Data export requested successfully!\n\nYou will receive an email when your data is ready for download.`)
    } catch (error) {
      console.error('Failed to request data export:', error)
      alert('Failed to request data export. Please try again.')
    } finally {
      setExporting(false)
    }
  }

  const handleDeleteAccount = async () => {
    const confirmed = confirm(
      `Delete your account?\n\n` +
      `This will permanently delete:\n` +
      `• Your user profile\n` +
      `• All your projects and data\n` +
      `• All your organization memberships\n\n` +
      `This action CANNOT be undone!\n\n` +
      `Type DELETE to confirm.`
    )
    if (!confirmed) return

    const confirmation = prompt('Type DELETE to confirm account deletion:')
    if (confirmation !== 'DELETE') {
      alert('Account deletion cancelled.')
      return
    }

    try {
      setDeleting(true)
      await api.delete('/gdpr/account')
      alert(`Account deletion initiated.\n\nYou will be logged out shortly.`)
      // Redirect to logout
      window.location.href = '/auth/login'
    } catch (error) {
      console.error('Failed to delete account:', error)
      alert('Failed to delete account. Please try again or contact support.')
      setDeleting(false)
    }
  }

  return (
    <div className="container mx-auto py-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Privacy & Data</h1>
        <p className="text-muted-foreground mt-1">
          Manage your personal data and privacy settings
        </p>
      </div>

      <div className="space-y-6">
        {/* GDPR Data Export */}
        <Card className="p-6">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-lg bg-blue-100 dark:bg-blue-900">
              <Download className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-semibold mb-2">Export Your Data</h2>
              <p className="text-sm text-muted-foreground mb-4">
                Request a copy of all your personal data stored in Flotilla.
                We&apos;ll compile your profile, projects, issues, and activity into a downloadable ZIP file.
              </p>
              <div className="flex items-center gap-4">
                <Button onClick={handleExportData} disabled={exporting}>
                  {exporting ? 'Requesting...' : 'Request Data Export'}
                </Button>
                <Badge variant="outline">GDPR Compliant</Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-3">
                ℹ️ Export typically takes 5-10 minutes. You&apos;ll receive an email with a download link.
              </p>
            </div>
          </div>
        </Card>

        {/* Privacy Information */}
        <Card className="p-6">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-lg bg-green-100 dark:bg-green-900">
              <Shield className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-semibold mb-2">Your Privacy Rights</h2>
              <ul className="text-sm text-muted-foreground space-y-2">
                <li>✓ <strong>Right to Access:</strong> Request a copy of your data</li>
                <li>✓ <strong>Right to Portability:</strong> Download your data in a machine-readable format</li>
                <li>✓ <strong>Right to Rectification:</strong> Update incorrect information via settings</li>
                <li>✓ <strong>Right to Erasure:</strong> Request permanent deletion of your account</li>
                <li>✓ <strong>Right to Object:</strong> Opt-out of certain data processing activities</li>
              </ul>
            </div>
          </div>
        </Card>

        {/* Danger Zone */}
        <Card className="p-6 border-destructive">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-lg bg-red-100 dark:bg-red-900">
              <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-semibold mb-2 text-destructive">Delete Account</h2>
              <p className="text-sm text-muted-foreground mb-4">
                Permanently delete your account and all associated data. 
                This action is irreversible and will remove all your projects, issues, and contributions.
              </p>
              <Button 
                variant="destructive" 
                onClick={handleDeleteAccount}
                disabled={deleting}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                {deleting ? 'Deleting...' : 'Delete My Account'}
              </Button>
              <p className="text-xs text-muted-foreground mt-3">
                ⚠️ Warning: This will permanently delete all your data, including projects you own.
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}
