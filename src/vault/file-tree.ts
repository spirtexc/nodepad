export interface VaultFile {
  name: string
  path: string
  handle: FileSystemFileHandle
}

export interface VaultFolder {
  name: string
  path: string
  children: TreeNode[]
}

export type TreeNode = { kind: 'file'; file: VaultFile } | { kind: 'folder'; folder: VaultFolder }

export async function buildFileTree(
  dir: FileSystemDirectoryHandle,
  basePath = '',
): Promise<TreeNode[]> {
  const nodes: TreeNode[] = []

  for await (const [name, entry] of dir.entries()) {
    if (name.startsWith('.')) continue

    if (entry.kind === 'file' && (name.toLowerCase().endsWith('.md') || name.toLowerCase().endsWith('.txt'))) {
      const path = basePath ? `${basePath}/${name}` : name
      nodes.push({ kind: 'file', file: { name, path, handle: entry } })
    } else if (entry.kind === 'directory') {
      const path = basePath ? `${basePath}/${name}` : name
      const children = await buildFileTree(entry, path)
      nodes.push({ kind: 'folder', folder: { name, path, children } })
    }
  }

  nodes.sort((a, b) => {
    if (a.kind !== b.kind) return a.kind === 'folder' ? -1 : 1
    const aName = a.kind === 'folder' ? a.folder.name : a.file.name
    const bName = b.kind === 'folder' ? b.folder.name : b.file.name
    return aName.localeCompare(bName)
  })

  return nodes
}
