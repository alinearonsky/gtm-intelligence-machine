import { createHash } from 'node:crypto'

export function contentHash(title: string, description: string): string {
  return createHash('sha256').update(JSON.stringify([title, description])).digest('hex')
}
