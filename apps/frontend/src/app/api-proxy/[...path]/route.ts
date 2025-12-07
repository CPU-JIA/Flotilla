/**
 * Next.js API代理路由
 * 用于解决HSTS和CORS问题
 *
 * 工作原理：
 * 1. 前端发送请求到同域：http://localhost:3000/api-proxy/*
 * 2. Next.js服务器端转发到后端：http://localhost:4000/api/*
 * 3. 避免浏览器HSTS升级（因为是同域请求）
 * 4. 避免CORS问题（服务器端请求无CORS限制）
 *
 * ECP-A1: SOLID原则 - 单一职责，仅做请求转发
 * ECP-C1: 防御性编程 - 错误处理和超时控制
 */

import { NextRequest, NextResponse } from 'next/server'

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:4000'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  return handleRequest(request, params, 'GET')
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  return handleRequest(request, params, 'POST')
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  return handleRequest(request, params, 'PUT')
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  return handleRequest(request, params, 'PATCH')
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  return handleRequest(request, params, 'DELETE')
}

async function handleRequest(
  request: NextRequest,
  params: { params: Promise<{ path: string[] }> },
  method: string
) {
  try {
    const resolvedParams = await params
    const path = resolvedParams.path.join('/')
    const searchParams = request.nextUrl.searchParams.toString()
    const queryString = searchParams ? `?${searchParams}` : ''

    // 构建后端API URL
    const backendUrl = `${BACKEND_URL}/api/${path}${queryString}`

    console.log(`[API Proxy] ${method} ${backendUrl}`)

    // 准备headers（排除host等浏览器专用headers）
    const headers = new Headers()
    request.headers.forEach((value, key) => {
      // 跳过这些headers，由fetch自动处理
      if (
        !['host', 'connection', 'content-length'].includes(key.toLowerCase())
      ) {
        headers.set(key, value)
      }
    })

    // 准备请求body（仅对POST/PUT/PATCH）
    let body: BodyInit | null = null
    if (['POST', 'PUT', 'PATCH'].includes(method)) {
      // 检查Content-Type来决定如何处理body
      const contentType = request.headers.get('content-type') || ''

      if (contentType.includes('application/json')) {
        // JSON数据 - 🔒 FIX: 处理空 body 的情况
        try {
          const text = await request.text()
          if (text && text.length > 0) {
            body = text
          }
        } catch (error) {
          console.warn('[API Proxy] Failed to read request body:', error)
          // body 保持为 null
        }
      } else if (contentType.includes('multipart/form-data')) {
        // FormData（文件上传）
        body = await request.arrayBuffer()
      } else if (contentType) {
        // 其他类型（text, blob等）- 仅当有 Content-Type 时才读取
        body = await request.arrayBuffer()
      }
      // 如果没有 Content-Type，body 保持为 null（允许无 body 的 POST 请求）
    }

    // 发送请求到后端
    const response = await fetch(backendUrl, {
      method,
      headers,
      body,
      // 30秒超时
      signal: AbortSignal.timeout(30000),
    })

    // 获取响应数据
    const data = await response.arrayBuffer()

    // 构建响应headers
    const responseHeaders = new Headers()
    response.headers.forEach((value, key) => {
      responseHeaders.set(key, value)
    })

    // 返回响应
    return new NextResponse(data, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    })
  } catch (error) {
    console.error('[API Proxy Error]:', error)

    // 超时错误
    if (error instanceof Error && error.name === 'AbortError') {
      return NextResponse.json(
        { message: 'Request timeout' },
        { status: 504 }
      )
    }

    // 其他错误
    return NextResponse.json(
      {
        message: 'Proxy error',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 502 }
    )
  }
}

// 配置运行时
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
