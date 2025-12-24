/**
 * Pipeline Types
 * ECP-A1: SOLID - Single Responsibility - Pipeline type definitions
 */

export interface Pipeline {
  id: string
  projectId: string
  name: string
  config: Record<string, any>
  triggers: string[]
  active: boolean
  createdAt: string
  updatedAt: string
}

export interface PipelineRun {
  id: string
  pipelineId: string
  commitSha: string
  branch: string
  status: PipelineRunStatus
  startedAt: string
  finishedAt: string | null
  duration: number | null
  logs: string | null
  metadata: Record<string, any> | null
  pipeline?: {
    id: string
    name: string
  }
  triggeredBy?: {
    id: string
    username: string
    email: string
  }
}

export enum PipelineRunStatus {
  PENDING = 'PENDING',
  RUNNING = 'RUNNING',
  SUCCESS = 'SUCCESS',
  FAILURE = 'FAILURE',
  CANCELLED = 'CANCELLED',
}

export interface CreatePipelineDto {
  name: string
  config: Record<string, any>
  triggers: string[]
  active?: boolean
}

export interface UpdatePipelineDto {
  name?: string
  config?: Record<string, any>
  triggers?: string[]
  active?: boolean
}

export interface TriggerPipelineDto {
  branch?: string
  commit?: string
}

// Available pipeline triggers
export const PIPELINE_TRIGGERS = [
  'push',
  'pull_request',
  'manual',
  'schedule',
] as const

export type PipelineTrigger = typeof PIPELINE_TRIGGERS[number]

// Pipeline step interface
export interface PipelineStep {
  name: string
  run: string
  workingDirectory?: string
  env?: Record<string, string>
}

// Pipeline config interface
export interface PipelineConfig {
  steps: PipelineStep[]
  env?: Record<string, string>
  timeout?: number
}
