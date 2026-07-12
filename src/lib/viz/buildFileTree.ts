import { hierarchy, treemap, treemapSquarify } from 'd3'
import type { FileChurnRecord } from '../../workers/commitAnalysis.types'

interface TreeNode {
  name: string
  children?: TreeNode[]
  record?: FileChurnRecord
}

function buildTree(records: FileChurnRecord[]): TreeNode {
  const root: TreeNode = { name: '', children: [] }

  for (const record of records) {
    const parts = record.path.split('/')
    let node = root
    parts.forEach((part, index) => {
      if (!node.children) node.children = []
      let child = node.children.find((c) => c.name === part)
      if (!child) {
        child = { name: part }
        node.children.push(child)
      }
      if (index === parts.length - 1) {
        child.record = record
      } else if (!child.children) {
        child.children = []
      }
      node = child
    })
  }

  return root
}

export interface LayoutNode {
  x0: number
  y0: number
  x1: number
  y1: number
  path: string
  record: FileChurnRecord
}

/** D3 does the math (hierarchy + treemap layout); the caller (React) only renders positions. */
export function layoutFileTree(
  records: FileChurnRecord[],
  width: number,
  height: number,
): LayoutNode[] {
  const hierarchyRoot = hierarchy(buildTree(records))
    .sum((d) => d.record?.churn ?? 0)
    .sort((a, b) => (b.value ?? 0) - (a.value ?? 0))

  const root = treemap<TreeNode>().size([width, height]).paddingInner(2).tile(treemapSquarify)(
    hierarchyRoot,
  )

  return root
    .leaves()
    .filter((leaf) => leaf.data.record)
    .map((leaf) => ({
      x0: leaf.x0 ?? 0,
      y0: leaf.y0 ?? 0,
      x1: leaf.x1 ?? 0,
      y1: leaf.y1 ?? 0,
      path: leaf.data.record!.path,
      record: leaf.data.record!,
    }))
}
