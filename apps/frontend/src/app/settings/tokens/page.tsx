'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { format } from 'date-fns'
import { toast } from 'sonner'
import { Copy, Plus, Trash2, Key } from 'lucide-react'
import { api } from '@/lib/api'

interface ApiToken {
  id: string
  name: string
  tokenPrefix: string
  scopes: string[]
  expiresAt: string | null
  lastUsedAt: string | null
  createdAt: string
}

interface CreateTokenResponse extends ApiToken {
  token: string
}

// 表单验证 Schema
const tokenFormSchema = z.object({
  name: z.string().min(1, '请输入令牌名称').max(100),
  scopes: z.array(z.string()).min(1, '请至少选择一个作用域'),
  expiresAt: z.string().optional(),
})

export default function TokensPage() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [createdToken, setCreatedToken] = useState<CreateTokenResponse | null>(null)
  const queryClient = useQueryClient()

  // 获取令牌列表
  const { data: tokens, isLoading } = useQuery({
    queryKey: ['api-tokens'],
    queryFn: async () => {
      const response = await api.get<ApiToken[]>('/api-tokens')
      return response.data
    },
  })

  // 创建令牌
  const createMutation = useMutation({
    mutationFn: async (data: z.infer<typeof tokenFormSchema>) => {
      const payload = {
        ...data,
        expiresAt: data.expiresAt ? new Date(data.expiresAt).toISOString() : undefined,
      }
      const response = await api.post<CreateTokenResponse>('/api-tokens', payload)
      return response.data
    },
    onSuccess: (data) => {
      setCreatedToken(data)
      setIsCreateDialogOpen(false)
      queryClient.invalidateQueries({ queryKey: ['api-tokens'] })
      toast.success('令牌创建成功')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || '创建令牌失败')
    },
  })

  // 删除令牌
  const deleteMutation = useMutation({
    mutationFn: async (tokenId: string) => {
      await api.delete(`/api-tokens/${tokenId}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['api-tokens'] })
      toast.success('令牌已撤销')
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || '撤销令牌失败')
    },
  })

  const form = useForm<z.infer<typeof tokenFormSchema>>({
    resolver: zodResolver(tokenFormSchema),
    defaultValues: {
      name: '',
      scopes: [],
      expiresAt: '',
    },
  })

  const handleCreateToken = (values: z.infer<typeof tokenFormSchema>) => {
    createMutation.mutate(values)
  }

  const handleCopyToken = (token: string) => {
    navigator.clipboard.writeText(token)
    toast.success('令牌已复制到剪贴板')
  }

  const handleDeleteToken = (tokenId: string, tokenName: string) => {
    if (confirm(`确定要撤销令牌 "${tokenName}" 吗？此操作无法撤销。`)) {
      deleteMutation.mutate(tokenId)
    }
  }

  return (
    <div className="container max-w-4xl py-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">API 令牌</h1>
          <p className="mt-2 text-muted-foreground">
            管理用于程序化访问 API 的个人访问令牌
          </p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          创建令牌
        </Button>
      </div>

      {isLoading ? (
        <Card>
          <CardContent className="py-8 text-center">加载中...</CardContent>
        </Card>
      ) : tokens && tokens.length > 0 ? (
        <div className="space-y-4">
          {tokens.map((token) => (
            <Card key={token.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Key className="h-5 w-5" />
                      {token.name}
                    </CardTitle>
                    <CardDescription className="mt-2">
                      <span className="font-mono text-sm">{token.tokenPrefix}...</span>
                    </CardDescription>
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDeleteToken(token.id, token.name)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="font-medium">作用域: </span>
                    <span className="text-muted-foreground">{token.scopes.join(', ')}</span>
                  </div>
                  <div>
                    <span className="font-medium">创建时间: </span>
                    <span className="text-muted-foreground">
                      {format(new Date(token.createdAt), 'yyyy-MM-dd HH:mm:ss')}
                    </span>
                  </div>
                  {token.expiresAt && (
                    <div>
                      <span className="font-medium">过期时间: </span>
                      <span className="text-muted-foreground">
                        {format(new Date(token.expiresAt), 'yyyy-MM-dd HH:mm:ss')}
                      </span>
                    </div>
                  )}
                  {token.lastUsedAt && (
                    <div>
                      <span className="font-medium">最后使用: </span>
                      <span className="text-muted-foreground">
                        {format(new Date(token.lastUsedAt), 'yyyy-MM-dd HH:mm:ss')}
                      </span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <Key className="mx-auto h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-semibold">暂无 API 令牌</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              创建一个令牌以开始使用 API
            </p>
            <Button className="mt-4" onClick={() => setIsCreateDialogOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              创建令牌
            </Button>
          </CardContent>
        </Card>
      )}

      {/* 创建令牌对话框 */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>创建 API 令牌</DialogTitle>
            <DialogDescription>
              创建一个新的个人访问令牌用于 API 访问。令牌只会显示一次，请妥善保管。
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleCreateToken)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>令牌名称</FormLabel>
                    <FormControl>
                      <Input placeholder="例如: CI/CD Pipeline" {...field} />
                    </FormControl>
                    <FormDescription>
                      用于识别此令牌的名称
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="scopes"
                render={() => (
                  <FormItem>
                    <FormLabel>作用域</FormLabel>
                    <FormDescription>选择令牌的访问权限</FormDescription>
                    <div className="space-y-2">
                      {['read', 'write', 'admin'].map((scope) => (
                        <FormField
                          key={scope}
                          control={form.control}
                          name="scopes"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                              <FormControl>
                                <Checkbox
                                  checked={field.value?.includes(scope)}
                                  onCheckedChange={(checked) => {
                                    return checked
                                      ? field.onChange([...field.value, scope])
                                      : field.onChange(
                                          field.value?.filter((value) => value !== scope)
                                        )
                                  }}
                                />
                              </FormControl>
                              <FormLabel className="font-normal">
                                {scope === 'read' && '读取 (read) - 只读访问'}
                                {scope === 'write' && '写入 (write) - 读写访问'}
                                {scope === 'admin' && '管理 (admin) - 完全访问'}
                              </FormLabel>
                            </FormItem>
                          )}
                        />
                      ))}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="expiresAt"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>过期时间（可选）</FormLabel>
                    <FormControl>
                      <Input type="datetime-local" {...field} />
                    </FormControl>
                    <FormDescription>
                      留空表示令牌永不过期
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCreateDialogOpen(false)}
                >
                  取消
                </Button>
                <Button type="submit" disabled={createMutation.isPending}>
                  {createMutation.isPending ? '创建中...' : '创建令牌'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* 显示创建的令牌对话框 */}
      <Dialog open={!!createdToken} onOpenChange={() => setCreatedToken(null)}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>令牌创建成功</DialogTitle>
            <DialogDescription>
              请立即复制此令牌，它只会显示一次。如果丢失，您需要创建新令牌。
            </DialogDescription>
          </DialogHeader>
          {createdToken && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">令牌名称</label>
                <p className="text-sm text-muted-foreground">{createdToken.name}</p>
              </div>
              <div>
                <label className="text-sm font-medium">令牌</label>
                <div className="mt-2 flex items-center gap-2">
                  <code className="flex-1 rounded bg-muted p-3 text-sm font-mono break-all">
                    {createdToken.token}
                  </code>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleCopyToken(createdToken.token)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setCreatedToken(null)}>
              我已保存此令牌
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
