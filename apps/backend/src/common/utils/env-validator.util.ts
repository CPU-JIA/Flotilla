/**
 * Environment Variable Validator
 *
 * 🔒 SECURITY FIX: Prevents environment variable injection attacks (CWE-78)
 * Whitelist-based validation for all environment variables passed to child processes
 *
 * ECP-C1: Defensive Programming - Validate all external inputs
 * ECP-B2: KISS - Simple whitelist validation approach
 */

import { Logger } from '@nestjs/common'

const logger = new Logger('EnvValidator')

/**
 * Whitelist of allowed PATH directories
 * Only include standard system paths to prevent command injection
 */
const ALLOWED_PATH_DIRS = [
  '/usr/bin',
  '/usr/local/bin',
  '/bin',
  '/opt/homebrew/bin', // macOS Homebrew
  'C:\\Program Files\\Git\\cmd', // Windows Git
  'C:\\Program Files\\Git\\bin',
  'C:\\Windows\\System32',
]

/**
 * Validate PATH environment variable
 *
 * @param path PATH environment variable value
 * @returns Sanitized PATH or default safe value
 */
export function validatePath(path: string | undefined): string {
  if (!path) {
    // Default safe PATH
    const platform = process.platform
    if (platform === 'win32') {
      return 'C:\\Program Files\\Git\\cmd;C:\\Windows\\System32'
    }
    return '/usr/bin:/usr/local/bin:/bin'
  }

  // Split PATH and filter against whitelist
  const separator = process.platform === 'win32' ? ';' : ':'
  const dirs = path.split(separator)

  const sanitizedDirs = dirs.filter((dir) => {
    // Normalize path for comparison
    const normalizedDir = dir.trim().replace(/\\/g, '/')

    // Check against whitelist
    return ALLOWED_PATH_DIRS.some((allowed) => {
      const normalizedAllowed = allowed.replace(/\\/g, '/')
      return normalizedDir === normalizedAllowed ||
             normalizedDir.startsWith(normalizedAllowed + '/')
    })
  })

  if (sanitizedDirs.length === 0) {
    logger.warn('PATH validation failed: no valid directories found, using default')
    return validatePath(undefined)
  }

  const sanitized = sanitizedDirs.join(separator)

  if (sanitized !== path) {
    logger.warn(`PATH sanitized: removed ${dirs.length - sanitizedDirs.length} unsafe directories`)
  }

  return sanitized
}

/**
 * Validate HOME directory
 *
 * @param home HOME environment variable value
 * @returns Sanitized HOME or default safe value
 */
export function validateHome(home: string | undefined): string {
  if (!home) {
    return process.platform === 'win32' ? 'C:\\temp' : '/tmp'
  }

  // Check for command injection patterns
  const dangerousPatterns = [
    /[;&|`$()]/,  // Shell metacharacters
    /\.\./,       // Path traversal
    /^-/,         // Argument injection
  ]

  for (const pattern of dangerousPatterns) {
    if (pattern.test(home)) {
      logger.warn(`HOME validation failed: contains dangerous pattern '${pattern}'`)
      return validateHome(undefined)
    }
  }

  // Validate it's an absolute path
  const isAbsolute = process.platform === 'win32'
    ? /^[A-Z]:\\/i.test(home)
    : home.startsWith('/')

  if (!isAbsolute) {
    logger.warn('HOME validation failed: not an absolute path')
    return validateHome(undefined)
  }

  return home
}

/**
 * Validate API Base URL
 *
 * 🔒 SECURITY: Prevent SSRF by only allowing localhost and internal IPs
 *
 * @param url API_BASE_URL environment variable value
 * @returns Sanitized URL or default safe value
 */
export function validateApiBaseUrl(url: string | undefined): string {
  const defaultUrl = 'http://localhost:4000/api'

  if (!url) {
    return defaultUrl
  }

  try {
    const parsed = new URL(url)

    // Only allow http/https protocols
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      logger.warn(`API_BASE_URL validation failed: invalid protocol '${parsed.protocol}'`)
      return defaultUrl
    }

    // Whitelist of allowed hostnames
    const allowedHostnames = [
      'localhost',
      '127.0.0.1',
      '::1',
      '0.0.0.0',
    ]

    // Check for private IP ranges (10.x.x.x, 172.16-31.x.x, 192.168.x.x)
    const isPrivateIp = (hostname: string): boolean => {
      const ipv4Regex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/
      const match = hostname.match(ipv4Regex)

      if (!match) return false

      const [, a, b] = match.map(Number)

      // 10.0.0.0/8
      if (a === 10) return true

      // 172.16.0.0/12
      if (a === 172 && b >= 16 && b <= 31) return true

      // 192.168.0.0/16
      if (a === 192 && b === 168) return true

      return false
    }

    const hostname = parsed.hostname.toLowerCase()

    // Allow localhost, loopback IPs, and private IPs
    if (!allowedHostnames.includes(hostname) && !isPrivateIp(hostname)) {
      logger.warn(`API_BASE_URL validation failed: hostname '${hostname}' not in whitelist`)
      return defaultUrl
    }

    return url
  } catch (error) {
    logger.warn(`API_BASE_URL validation failed: invalid URL format - ${error.message}`)
    return defaultUrl
  }
}

/**
 * Validate all environment variables required for git http-backend
 *
 * @returns Sanitized environment variables object
 */
export function validateGitEnvironment(env: NodeJS.ProcessEnv): Record<string, string> {
  return {
    PATH: validatePath(env.PATH),
    HOME: validateHome(env.HOME),
    NODE_ENV: env.NODE_ENV || 'development',
  }
}

/**
 * Validate PROJECT_ID to prevent injection
 *
 * @param projectId Project identifier
 * @returns true if valid, false otherwise
 */
export function validateProjectId(projectId: string): boolean {
  // Only allow alphanumeric characters and hyphens (cuid format)
  return /^[a-z0-9-]+$/i.test(projectId)
}

/**
 * Validate query string to prevent injection
 *
 * @param queryString Query string from request
 * @returns true if valid, false otherwise
 */
export function validateQueryString(queryString: string): boolean {
  // Only allow safe characters in query strings
  return /^[a-zA-Z0-9=&-]+$/.test(queryString)
}
