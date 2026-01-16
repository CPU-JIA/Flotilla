import { Code, Lock, Users, FolderGit, FileText, ExternalLink } from 'lucide-react'
import { CodeBlock } from '@/components/ui/code-block'

export const metadata = {
  title: 'API Reference - Flotilla Documentation',
  description:
    'Complete API reference for Flotilla. Explore all available endpoints with examples.',
}

export default function APIPage() {
  const authExample = `// Register a new user
POST /api/auth/register
{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "username": "johndoe"
}

Response: 201 Created
{
  "accessToken": "eyJhbGci...",
  "refreshToken": "eyJhbGci...",
  "user": {
    "id": "cm3abc123",
    "email": "user@example.com",
    "username": "johndoe",
    "role": "USER"
  }
}

// Login
POST /api/auth/login
{
  "email": "user@example.com",
  "password": "SecurePass123!"
}

// Refresh token
POST /api/auth/refresh
{
  "refreshToken": "eyJhbGci..."
}`

  const orgExample = `// Create organization
POST /api/organizations
Authorization: Bearer <accessToken>
{
  "name": "My Company",
  "slug": "my-company"
}

// List user organizations
GET /api/organizations

// Get organization details
GET /api/organizations/:id

// Add member to organization
POST /api/organizations/:id/members
{
  "userId": "cm3xyz789",
  "role": "MEMBER"  // OWNER | ADMIN | MEMBER
}

// Update member role
PATCH /api/organizations/:id/members/:userId
{
  "role": "ADMIN"
}

// Remove member
DELETE /api/organizations/:id/members/:userId`

  const projectExample = `// Create project
POST /api/projects
{
  "name": "My Project",
  "description": "Project description",
  "organizationId": "cm3org123"
}

// List projects
GET /api/projects?organizationId=cm3org123

// Get project details
GET /api/projects/:id

// Update project
PATCH /api/projects/:id
{
  "name": "Updated Name",
  "description": "New description"
}

// Delete project
DELETE /api/projects/:id`

  const filesExample = `// Upload file
POST /api/files/upload
Content-Type: multipart/form-data

{
  file: <binary>,
  projectId: "cm3proj123"
}

Response: 201 Created
{
  "id": "cm3file456",
  "filename": "example.txt",
  "size": 1024,
  "minioPath": "projects/cm3proj123/example.txt",
  "url": "/api/files/cm3file456/download"
}

// Download file
GET /api/files/:id/download

// List project files
GET /api/files?projectId=cm3proj123

// Delete file
DELETE /api/files/:id`

  return (
    <div className="py-12 px-8 max-w-4xl">
      {/* Hero */}
      <div className="mb-12">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-accent/10 border border-accent/20 text-sm text-accent mb-6">
          <Code className="h-4 w-4" />
          <span>REST API</span>
        </div>
        <h1 className="text-5xl font-bold mb-4">API Reference</h1>
        <p className="text-xl text-foreground/60 max-w-2xl">
          Complete reference for all Flotilla API endpoints. All requests require JSON content type
          unless specified.
        </p>
      </div>

      {/* Base URL */}
      <section className="mb-12">
        <div className="p-6 rounded-xl bg-primary/10 border border-primary/20">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-semibold">Base URL</h3>
            <a
              href="http://localhost:4000/api/docs"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
            >
              <ExternalLink className="h-4 w-4" />
              Interactive Swagger Docs
            </a>
          </div>
          <code className="text-lg font-mono">http://localhost:4000/api</code>
          <div className="mt-4 text-sm text-foreground/70">
            All endpoints are prefixed with{' '}
            <code className="px-2 py-1 rounded bg-secondary">/api</code>. For production, replace
            with your deployed backend URL.
          </div>
        </div>
      </section>

      {/* Authentication */}
      <section className="mb-12">
        <div className="flex items-center gap-3 mb-6">
          <Lock className="h-8 w-8 text-red-500" />
          <h2 className="text-3xl font-bold">Authentication</h2>
        </div>
        <div className="space-y-6">
          <div>
            <p className="text-foreground/70 mb-4">
              Flotilla uses JWT (JSON Web Tokens) for authentication. After login, include the
              access token in the{' '}
              <code className="px-2 py-1 rounded bg-secondary">Authorization</code> header.
            </p>
            <CodeBlock
              code={authExample}
              language="typescript"
              filename="Authentication Endpoints"
            />
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="p-4 rounded-lg bg-secondary/30 border border-border/40">
              <h4 className="font-semibold mb-2">Access Token</h4>
              <ul className="text-sm space-y-1 text-foreground/70">
                <li>• Expires in: 7 days (default)</li>
                <li>• Use in Authorization header</li>
                <li>
                  • Format: <code className="px-1 rounded bg-card">Bearer &lt;token&gt;</code>
                </li>
              </ul>
            </div>
            <div className="p-4 rounded-lg bg-secondary/30 border border-border/40">
              <h4 className="font-semibold mb-2">Refresh Token</h4>
              <ul className="text-sm space-y-1 text-foreground/70">
                <li>• Expires in: 30 days (default)</li>
                <li>• Use to get new access token</li>
                <li>
                  • Endpoint: <code className="px-1 rounded bg-card">/api/auth/refresh</code>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Organizations */}
      <section className="mb-12">
        <div className="flex items-center gap-3 mb-6">
          <Users className="h-8 w-8 text-blue-500" />
          <h2 className="text-3xl font-bold">Organizations</h2>
        </div>
        <CodeBlock code={orgExample} language="typescript" filename="Organization Endpoints" />
        <div className="mt-6 p-4 rounded-lg bg-accent/10 border border-accent/20 text-sm">
          <strong>💡 Organization Roles:</strong>
          <ul className="mt-2 space-y-1 text-foreground/70">
            <li>
              • <strong>OWNER:</strong> Full control, can delete organization
            </li>
            <li>
              • <strong>ADMIN:</strong> Can manage members and teams (but not delete org)
            </li>
            <li>
              • <strong>MEMBER:</strong> Read-only access to organization
            </li>
          </ul>
        </div>
      </section>

      {/* Teams */}
      <section className="mb-12">
        <div className="flex items-center gap-3 mb-6">
          <Users className="h-8 w-8 text-green-500" />
          <h2 className="text-3xl font-bold">Teams</h2>
        </div>
        <div className="space-y-4">
          <p className="text-foreground/70">
            Teams belong to organizations and can be assigned project permissions.
          </p>
          <div className="p-6 rounded-xl bg-secondary/20 border border-border/40">
            <h4 className="font-semibold mb-4">Key Endpoints</h4>
            <div className="space-y-2 text-sm font-mono">
              <div className="flex justify-between">
                <span className="text-green-400">POST</span>
                <span className="text-foreground/70">/api/teams</span>
                <span className="text-foreground/50">Create team</span>
              </div>
              <div className="flex justify-between">
                <span className="text-blue-400">GET</span>
                <span className="text-foreground/70">/api/teams/:id</span>
                <span className="text-foreground/50">Get team details</span>
              </div>
              <div className="flex justify-between">
                <span className="text-green-400">POST</span>
                <span className="text-foreground/70">/api/teams/:id/members</span>
                <span className="text-foreground/50">Add member</span>
              </div>
              <div className="flex justify-between">
                <span className="text-green-400">POST</span>
                <span className="text-foreground/70">/api/teams/:id/permissions</span>
                <span className="text-foreground/50">Assign project access</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Projects */}
      <section className="mb-12">
        <div className="flex items-center gap-3 mb-6">
          <FolderGit className="h-8 w-8 text-purple-500" />
          <h2 className="text-3xl font-bold">Projects</h2>
        </div>
        <CodeBlock code={projectExample} language="typescript" filename="Project Endpoints" />
      </section>

      {/* Files */}
      <section className="mb-12">
        <div className="flex items-center gap-3 mb-6">
          <FileText className="h-8 w-8 text-orange-500" />
          <h2 className="text-3xl font-bold">Files</h2>
        </div>
        <CodeBlock code={filesExample} language="typescript" filename="File Endpoints" />
        <div className="mt-6 p-4 rounded-lg bg-primary/10 border border-primary/20 text-sm">
          <strong>📦 File Storage:</strong> Files are stored in MinIO (S3-compatible object
          storage). Maximum file size: 100MB (configurable via environment variables).
        </div>
      </section>

      {/* Monitoring */}
      <section className="mb-12">
        <h2 className="text-3xl font-bold mb-6">Monitoring & Raft</h2>
        <div className="grid md:grid-cols-2 gap-6">
          <div className="p-6 rounded-xl bg-card border border-border/40">
            <h4 className="font-semibold mb-4">System Metrics</h4>
            <code className="text-sm">GET /api/monitoring/metrics</code>
            <p className="text-sm text-foreground/70 mt-3">
              Returns real-time system metrics including request counts, response times, and
              performance data.
            </p>
          </div>
          <div className="p-6 rounded-xl bg-card border border-border/40">
            <h4 className="font-semibold mb-4">Raft Cluster (WebSocket)</h4>
            <code className="text-sm">ws://localhost:4000/raft</code>
            <p className="text-sm text-foreground/70 mt-3">
              Connect via WebSocket to receive real-time Raft cluster state updates and metrics.
            </p>
          </div>
        </div>
      </section>

      {/* Error Responses */}
      <section className="mb-12">
        <h2 className="text-3xl font-bold mb-6">Error Responses</h2>
        <div className="space-y-4">
          <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20">
            <div className="flex items-center gap-2 mb-2">
              <span className="font-mono text-sm text-red-400">401 Unauthorized</span>
            </div>
            <p className="text-sm text-foreground/70">
              Missing or invalid JWT token. Login required.
            </p>
          </div>
          <div className="p-4 rounded-lg bg-orange-500/10 border border-orange-500/20">
            <div className="flex items-center gap-2 mb-2">
              <span className="font-mono text-sm text-orange-400">403 Forbidden</span>
            </div>
            <p className="text-sm text-foreground/70">
              Insufficient permissions for this operation.
            </p>
          </div>
          <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
            <div className="flex items-center gap-2 mb-2">
              <span className="font-mono text-sm text-yellow-400">404 Not Found</span>
            </div>
            <p className="text-sm text-foreground/70">Resource does not exist.</p>
          </div>
          <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
            <div className="flex items-center gap-2 mb-2">
              <span className="font-mono text-sm text-blue-400">422 Unprocessable Entity</span>
            </div>
            <p className="text-sm text-foreground/70">
              Validation failed. Check request body format.
            </p>
          </div>
        </div>
      </section>

      {/* Swagger Link */}
      <section>
        <div className="p-8 rounded-2xl bg-gradient-to-br from-primary/10 to-accent/10 border border-border/40">
          <h2 className="text-3xl font-bold mb-4">Interactive API Documentation</h2>
          <p className="text-foreground/70 mb-6">
            For a fully interactive API experience with live testing, explore our Swagger
            documentation. Test endpoints directly from your browser with authentication support.
          </p>
          <a
            href="http://localhost:4000/api/docs"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 h-11 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors font-medium"
          >
            Open Swagger Docs
            <ExternalLink className="h-4 w-4" />
          </a>
        </div>
      </section>
    </div>
  )
}
