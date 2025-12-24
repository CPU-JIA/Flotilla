import { NextRequest, NextResponse } from 'next/server'

/**
 * POST /api/newsletter/subscribe
 * Subscribe to newsletter
 * 将订阅请求转发到后端API
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email } = body

    // 转发到后端API
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'
    const response = await fetch(`${backendUrl}/newsletter/subscribe`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email }),
    })

    const data = await response.json()

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status })
    }

    return NextResponse.json(data, { status: response.status })
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
 * Get subscriber stats (proxy to backend)
 */
export async function GET() {
  try {
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000'
    const response = await fetch(`${backendUrl}/newsletter/stats`)
    const data = await response.json()

    return NextResponse.json(data)
  } catch (error) {
    console.error('[Newsletter] Stats error:', error)
    return NextResponse.json({ count: 0 })
  }
}
