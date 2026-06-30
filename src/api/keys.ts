export const qk = {
  clients: ['clients'] as const,
  stages: ['stages'] as const,
  templates: ['templates'] as const,
  board: ['board'] as const,
  request: (id: string) => ['request', id] as const,
  comments: (id: string) => ['comments', id] as const,
  profiles: ['profiles'] as const,
}
