import { FileText, CheckCircle, Github } from 'lucide-react'
import Link from 'next/link'

export const metadata = {
  title: 'License - Flotilla',
  description: 'Flotilla is MIT licensed. Free to use, modify, and distribute.',
}

export default function LicensePage() {
  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="py-24 bg-gradient-to-br from-green-500/10 via-background to-blue-500/10">
        <div className="container mx-auto px-4 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-500/10 border border-green-500/20 text-sm text-green-400 mb-6">
            <FileText className="h-4 w-4" />
            <span>MIT License</span>
          </div>
          <h1 className="text-5xl sm:text-6xl font-bold mb-6">
            Open Source License
          </h1>
          <p className="text-xl text-foreground/60 max-w-2xl mx-auto">
            Flotilla is 100% open source under the MIT License. Free to use, modify, and distribute.
          </p>
        </div>
      </section>

      {/* License Text */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <div className="p-8 rounded-2xl bg-card border border-border/40">
              <h2 className="text-3xl font-bold mb-6">MIT License</h2>

              <div className="prose prose-invert max-w-none">
                <p className="text-foreground/70 mb-6">
                  Copyright (c) 2025 JIA
                </p>

                <p className="text-foreground/70 leading-relaxed mb-6">
                  Permission is hereby granted, free of charge, to any person obtaining a copy
                  of this software and associated documentation files (the &quot;Software&quot;), to deal
                  in the Software without restriction, including without limitation the rights
                  to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
                  copies of the Software, and to permit persons to whom the Software is
                  furnished to do so, subject to the following conditions:
                </p>

                <p className="text-foreground/70 leading-relaxed mb-6">
                  The above copyright notice and this permission notice shall be included in all
                  copies or substantial portions of the Software.
                </p>

                <p className="text-foreground/70 leading-relaxed mb-6">
                  THE SOFTWARE IS PROVIDED &quot;AS IS&quot;, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
                  IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
                  FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
                  AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
                  LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
                  OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
                  SOFTWARE.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* What This Means */}
      <section className="py-16 bg-secondary/20 border-y border-border/40">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold mb-8 text-center">What This Means for You</h2>
            <div className="grid md:grid-cols-2 gap-6">
              {[
                {
                  title: 'Commercial Use',
                  description: 'Use Flotilla in commercial projects without restrictions.',
                },
                {
                  title: 'Modification',
                  description: 'Modify the source code to fit your needs.',
                },
                {
                  title: 'Distribution',
                  description: 'Distribute original or modified versions.',
                },
                {
                  title: 'Private Use',
                  description: 'Use Flotilla for private projects and internal tools.',
                },
                {
                  title: 'No Liability',
                  description: 'Software is provided "as is" without warranty.',
                },
                {
                  title: 'Attribution',
                  description: 'Include the copyright notice in all copies.',
                },
              ].map((item) => (
                <div
                  key={item.title}
                  className="flex items-start gap-3 p-6 rounded-xl bg-card border border-border/40"
                >
                  <CheckCircle className="h-6 w-6 text-green-500 flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="font-semibold mb-2">{item.title}</h3>
                    <p className="text-sm text-foreground/70">{item.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Why MIT */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-3xl font-bold mb-8 text-center">Why MIT License?</h2>
            <div className="space-y-6">
              <div className="p-6 rounded-xl bg-card border border-border/40">
                <h4 className="font-semibold mb-3 text-lg">Maximum Freedom</h4>
                <p className="text-foreground/70 leading-relaxed">
                  The MIT License is one of the most permissive open source licenses. It allows you to do
                  almost anything with the code, including using it in proprietary software, as long as you
                  include the original copyright notice.
                </p>
              </div>

              <div className="p-6 rounded-xl bg-card border border-border/40">
                <h4 className="font-semibold mb-3 text-lg">No Vendor Lock-in</h4>
                <p className="text-foreground/70 leading-relaxed">
                  We do not believe in open-core bait-and-switch tactics. Every feature of Flotilla is and
                  will remain open source under MIT. You can fork, modify, and self-host without any
                  restrictions or concerns about future license changes.
                </p>
              </div>

              <div className="p-6 rounded-xl bg-card border border-border/40">
                <h4 className="font-semibold mb-3 text-lg">Community-Driven</h4>
                <p className="text-foreground/70 leading-relaxed">
                  True open source means transparent development and community collaboration. The MIT License
                  encourages contributions by removing legal barriers and uncertainty about how the code can
                  be used.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16">
        <div className="container mx-auto px-4 text-center">
          <div className="max-w-2xl mx-auto p-8 rounded-2xl bg-gradient-to-br from-primary/10 to-accent/10 border border-border/40">
            <h2 className="text-3xl font-bold mb-4">Ready to Build?</h2>
            <p className="text-foreground/60 mb-6">
              Fork Flotilla, modify it, build on it, sell it. We encourage you to create your own
              version and contribute improvements back to the community.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a
                href="https://github.com/CPU-JIA/Cloud-Dev-Platform"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-6 h-11 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors font-medium"
              >
                <Github className="h-5 w-5" />
                Fork on GitHub
              </a>
              <Link
                href="/docs/contributing"
                className="inline-flex items-center gap-2 px-6 h-11 rounded-lg border border-border hover:bg-secondary transition-colors font-medium"
              >
                Contributing Guide
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
