import { NextRequest, NextResponse } from 'next/server'

// Simple in-memory storage for demo (replace with database in production)
const subscribers = new Set<string>()

/**
 * POST /api/newsletter/subscribe
 * Subscribe to newsletter
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email } = body

    // Validation
    if (!email || typeof email !== 'string') {
      return NextResponse.json(
        { message: 'Email is required' },
        { status: 400 }
      )
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { message: 'Invalid email format' },
        { status: 400 }
      )
    }

    // Normalize email (lowercase)
    const normalizedEmail = email.toLowerCase().trim()

    // Check if already subscribed
    if (subscribers.has(normalizedEmail)) {
      return NextResponse.json(
        { message: 'This email is already subscribed' },
        { status: 409 }
      )
    }

    // Add to subscribers (in production, save to database)
    subscribers.add(normalizedEmail)

    // TODO: Send confirmation email via Resend/SendGrid
    // TODO: Store in PostgreSQL via backend API

    console.log(`[Newsletter] New subscriber: ${normalizedEmail}`)
    console.log(`[Newsletter] Total subscribers: ${subscribers.size}`)

    return NextResponse.json(
      {
        message: 'Successfully subscribed',
        email: normalizedEmail,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('[Newsletter] Subscription error:', error)
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/newsletter/subscribe
 * Get subscriber count (for admin/stats)
 */
export async function GET() {
  return NextResponse.json({
    count: subscribers.size,
    // Don't expose actual emails for privacy
  })
}
