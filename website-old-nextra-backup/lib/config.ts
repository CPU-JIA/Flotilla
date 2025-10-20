/**
 * Website configuration
 * Centralizes all external URLs and constants
 */

export const config = {
  /**
   * Main application URL
   * Points to the Flotilla app (apps/frontend)
   */
  appUrl: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',

  /**
   * GitHub repository URL
   */
  githubUrl: 'https://github.com/CPU-JIA/Cloud-Dev-Platform',

  /**
   * Auth routes
   */
  routes: {
    login: '/auth/login',
    register: '/auth/register',
    dashboard: '/dashboard',
  },

  /**
   * Get full auth URLs
   */
  getLoginUrl() {
    return `${this.appUrl}${this.routes.login}`
  },

  getRegisterUrl() {
    return `${this.appUrl}${this.routes.register}`
  },

  getDashboardUrl() {
    return `${this.appUrl}${this.routes.dashboard}`
  },
}
