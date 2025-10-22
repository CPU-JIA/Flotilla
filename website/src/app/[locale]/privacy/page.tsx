import { Shield, Eye, Lock, UserX } from 'lucide-react'

export const metadata = {
  title: 'Privacy Policy - Flotilla',
  description: 'Flotilla privacy policy. Learn how we collect, use, and protect your data.',
}

export default function PrivacyPage() {
  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="py-24 bg-gradient-to-br from-purple-500/10 via-background to-pink-500/10">
        <div className="container mx-auto px-4 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-purple-500/10 border border-purple-500/20 text-sm text-purple-400 mb-6">
            <Shield className="h-4 w-4" />
            <span>Privacy Policy</span>
          </div>
          <h1 className="text-5xl sm:text-6xl font-bold mb-6">
            Privacy Policy
          </h1>
          <p className="text-xl text-foreground/60 max-w-2xl mx-auto mb-4">
            Your privacy is important to us. This policy explains how we collect, use, and protect your data.
          </p>
          <p className="text-sm text-foreground/40">
            Last updated: October 22, 2025
          </p>
        </div>
      </section>

      {/* Key Principles */}
      <section className="py-16 bg-secondary/20 border-y border-border/40">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold mb-8 text-center">Our Privacy Principles</h2>
            <div className="grid md:grid-cols-3 gap-6">
              {[
                {
                  icon: Eye,
                  title: 'Transparency',
                  description: 'We are open about what data we collect and why.',
                },
                {
                  icon: Lock,
                  title: 'Security',
                  description: 'Your data is encrypted and stored securely.',
                },
                {
                  icon: UserX,
                  title: 'Your Control',
                  description: 'You can delete your account and data anytime.',
                },
              ].map((principle) => {
                const Icon = principle.icon
                return (
                  <div
                    key={principle.title}
                    className="p-6 rounded-xl bg-card border border-border/40 text-center"
                  >
                    <Icon className="h-10 w-10 text-primary mx-auto mb-4" />
                    <h3 className="font-semibold mb-2">{principle.title}</h3>
                    <p className="text-sm text-foreground/70">{principle.description}</p>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Policy Sections */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto space-y-12">
            {/* Information We Collect */}
            <div>
              <h2 className="text-3xl font-bold mb-6">1. Information We Collect</h2>
              <div className="space-y-4">
                <div className="p-6 rounded-xl bg-card border border-border/40">
                  <h3 className="font-semibold mb-3 text-lg">Account Information</h3>
                  <ul className="space-y-2 text-foreground/70">
                    <li>• Email address (required for account creation)</li>
                    <li>• Username and display name</li>
                    <li>• Password (encrypted with bcrypt, never stored in plain text)</li>
                    <li>• Profile picture (optional)</li>
                  </ul>
                </div>

                <div className="p-6 rounded-xl bg-card border border-border/40">
                  <h3 className="font-semibold mb-3 text-lg">Usage Data</h3>
                  <ul className="space-y-2 text-foreground/70">
                    <li>• Repository and project information you create</li>
                    <li>• Git commits, pull requests, and code changes</li>
                    <li>• Comments, issues, and collaboration activity</li>
                    <li>• Organization and team memberships</li>
                  </ul>
                </div>

                <div className="p-6 rounded-xl bg-card border border-border/40">
                  <h3 className="font-semibold mb-3 text-lg">Technical Data</h3>
                  <ul className="space-y-2 text-foreground/70">
                    <li>• IP address and browser information</li>
                    <li>• Device type and operating system</li>
                    <li>• Session tokens and authentication cookies</li>
                    <li>• Performance metrics and error logs</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* How We Use Data */}
            <div>
              <h2 className="text-3xl font-bold mb-6">2. How We Use Your Data</h2>
              <div className="p-6 rounded-xl bg-card border border-border/40">
                <ul className="space-y-3 text-foreground/70">
                  <li className="flex items-start gap-3">
                    <span className="text-primary mt-1">•</span>
                    <span><strong className="text-foreground">Provide Services:</strong> Enable you to use Flotilla features (repositories, collaboration, Raft consensus)</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-primary mt-1">•</span>
                    <span><strong className="text-foreground">Improve Product:</strong> Analyze usage patterns to enhance performance and user experience</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-primary mt-1">•</span>
                    <span><strong className="text-foreground">Security:</strong> Detect and prevent fraud, abuse, and security threats</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-primary mt-1">•</span>
                    <span><strong className="text-foreground">Communication:</strong> Send important updates, security alerts, and service notifications</span>
                  </li>
                </ul>
              </div>
            </div>

            {/* Data Storage */}
            <div>
              <h2 className="text-3xl font-bold mb-6">3. Data Storage & Security</h2>
              <div className="space-y-4">
                <div className="p-6 rounded-xl bg-card border border-border/40">
                  <h3 className="font-semibold mb-3 text-lg">Encryption</h3>
                  <p className="text-foreground/70 leading-relaxed">
                    All data is encrypted in transit (HTTPS/TLS) and at rest. Passwords are hashed using bcrypt
                    with salt. Database backups are encrypted with AES-256.
                  </p>
                </div>

                <div className="p-6 rounded-xl bg-card border border-border/40">
                  <h3 className="font-semibold mb-3 text-lg">Infrastructure</h3>
                  <p className="text-foreground/70 leading-relaxed">
                    Data is stored in secure data centers with PostgreSQL (user data), Redis (session cache),
                    and MinIO (file storage). Regular backups are performed automatically.
                  </p>
                </div>

                <div className="p-6 rounded-xl bg-card border border-border/40">
                  <h3 className="font-semibold mb-3 text-lg">Access Control</h3>
                  <p className="text-foreground/70 leading-relaxed">
                    Only authorized team members have access to user data, and all access is logged and audited.
                    We follow the principle of least privilege.
                  </p>
                </div>
              </div>
            </div>

            {/* Data Sharing */}
            <div>
              <h2 className="text-3xl font-bold mb-6">4. Data Sharing</h2>
              <div className="p-6 rounded-xl bg-card border border-border/40">
                <p className="text-foreground/70 leading-relaxed mb-4">
                  <strong className="text-foreground">We do NOT sell your data to third parties.</strong> Your data
                  is only shared in the following limited circumstances:
                </p>
                <ul className="space-y-2 text-foreground/70">
                  <li>• <strong>With your permission:</strong> When you explicitly share repositories or collaborate with others</li>
                  <li>• <strong>Service providers:</strong> Cloud hosting, email delivery, analytics (anonymized)</li>
                  <li>• <strong>Legal requirements:</strong> If required by law or to protect our rights</li>
                </ul>
              </div>
            </div>

            {/* Your Rights */}
            <div>
              <h2 className="text-3xl font-bold mb-6">5. Your Rights</h2>
              <div className="grid md:grid-cols-2 gap-4">
                {[
                  { title: 'Access', description: 'Request a copy of your data' },
                  { title: 'Correction', description: 'Update incorrect or outdated information' },
                  { title: 'Deletion', description: 'Delete your account and all associated data' },
                  { title: 'Export', description: 'Download your repositories and data' },
                  { title: 'Opt-out', description: 'Unsubscribe from marketing emails' },
                  { title: 'Object', description: 'Object to certain data processing' },
                ].map((right) => (
                  <div
                    key={right.title}
                    className="p-4 rounded-lg bg-card border border-border/40"
                  >
                    <h4 className="font-semibold mb-1">{right.title}</h4>
                    <p className="text-sm text-foreground/70">{right.description}</p>
                  </div>
                ))}
              </div>
              <div className="mt-6 p-4 rounded-lg bg-primary/10 border border-primary/20 text-sm">
                <strong>To exercise your rights:</strong> Email us at privacy@flotilla.dev or use the account settings page.
              </div>
            </div>

            {/* Cookies */}
            <div>
              <h2 className="text-3xl font-bold mb-6">6. Cookies & Tracking</h2>
              <div className="p-6 rounded-xl bg-card border border-border/40">
                <p className="text-foreground/70 leading-relaxed mb-4">
                  We use cookies and similar technologies for:
                </p>
                <ul className="space-y-2 text-foreground/70">
                  <li>• <strong>Authentication:</strong> Keep you logged in across sessions (httpOnly cookies)</li>
                  <li>• <strong>Preferences:</strong> Remember your language, theme, and settings</li>
                  <li>• <strong>Analytics:</strong> Understand how you use Flotilla (anonymized data)</li>
                </ul>
                <p className="text-foreground/70 leading-relaxed mt-4">
                  You can disable non-essential cookies in your browser settings. Essential cookies (authentication)
                  are required for the service to function.
                </p>
              </div>
            </div>

            {/* Changes */}
            <div>
              <h2 className="text-3xl font-bold mb-6">7. Policy Changes</h2>
              <div className="p-6 rounded-xl bg-card border border-border/40">
                <p className="text-foreground/70 leading-relaxed">
                  We may update this privacy policy from time to time. We will notify you of significant changes
                  via email or through the platform. Continued use of Flotilla after changes indicates acceptance
                  of the updated policy.
                </p>
              </div>
            </div>

            {/* Contact */}
            <div>
              <h2 className="text-3xl font-bold mb-6">8. Contact Us</h2>
              <div className="p-6 rounded-xl bg-card border border-border/40">
                <p className="text-foreground/70 leading-relaxed mb-4">
                  If you have questions about this privacy policy or our data practices:
                </p>
                <ul className="space-y-2 text-foreground/70">
                  <li>• Email: <a href="mailto:privacy@flotilla.dev" className="text-primary hover:underline">privacy@flotilla.dev</a></li>
                  <li>• GitHub Issues: <a href="https://github.com/CPU-JIA/Cloud-Dev-Platform/issues" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">Report a privacy concern</a></li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer CTA */}
      <section className="py-16 bg-secondary/20 border-t border-border/40">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-2xl font-bold mb-4">Questions About Privacy?</h2>
          <p className="text-foreground/60 mb-6 max-w-2xl mx-auto">
            We are committed to transparency. If you have any concerns about how we handle your data,
            please do not hesitate to reach out.
          </p>
          <a
            href="mailto:privacy@flotilla.dev"
            className="inline-flex items-center gap-2 px-6 h-11 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors font-medium"
          >
            Contact Privacy Team
          </a>
        </div>
      </section>
    </div>
  )
}
