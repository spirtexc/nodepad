import { get, set } from 'idb-keyval'

const KEY = 'device-id'

export async function getDeviceId(): Promise<string> {
  try {
    const stored = await get<string>(KEY)
    if (stored) return stored
    const id = crypto.randomUUID()
    await set(KEY, id)
    return id
  } catch {
    return crypto.randomUUID()
  }
}
