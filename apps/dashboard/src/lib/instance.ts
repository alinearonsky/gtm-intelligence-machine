export type InstanceMode = 'public' | 'private'

/** Fail safe for mutations: anything that isn't exactly 'private' is public. */
export function instanceMode(): InstanceMode {
  return process.env.INSTANCE_MODE === 'private' ? 'private' : 'public'
}

export function isPrivate(): boolean {
  return instanceMode() === 'private'
}

/** Guard every write path. Public instances are read-only. */
export function assertWritable(): void {
  if (!isPrivate()) {
    throw new Error('This instance is read-only (INSTANCE_MODE is not "private").')
  }
}
