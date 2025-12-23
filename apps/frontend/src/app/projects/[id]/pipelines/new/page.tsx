'use client'

import { useParams } from 'next/navigation'
import { PipelineForm } from '@/components/pipelines/pipeline-form'

export default function NewPipelinePage() {
  const params = useParams()
  const projectId = params.id as string

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">创建流水线</h1>
        <p className="text-gray-600 mt-2">
          配置 CI/CD 流水线以自动化构建、测试和部署流程
        </p>
      </div>

      <PipelineForm projectId={projectId} />
    </div>
  )
}
