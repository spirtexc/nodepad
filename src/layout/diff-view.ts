type DiffLine =
  | { type: 'same';    text: string; lineA: number; lineB: number }
  | { type: 'added';   text: string; lineB: number }
  | { type: 'removed'; text: string; lineA: number }

function computeDiff(aLines: string[], bLines: string[]): DiffLine[] {
  const m = aLines.length
  const n = bLines.length
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0))
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = aLines[i - 1] === bLines[j - 1]
        ? dp[i - 1][j - 1] + 1
        : Math.max(dp[i - 1][j], dp[i][j - 1])

  const result: DiffLine[] = []
  let i = m, j = n, la = m, lb = n
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && aLines[i - 1] === bLines[j - 1]) {
      result.unshift({ type: 'same', text: aLines[i - 1], lineA: i, lineB: j })
      i--; j--
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      result.unshift({ type: 'added', text: bLines[j - 1], lineB: j-- })
    } else {
      result.unshift({ type: 'removed', text: aLines[i - 1], lineA: i-- })
    }
  }
  void la; void lb
  return result
}

export function buildDiffModal(
  nameA: string, contentA: string,
  nameB: string, contentB: string,
  onRestoreA?: () => void,
): HTMLElement {
  const aLines = contentA.split('\n')
  const bLines = contentB.split('\n')
  const diff = computeDiff(aLines, bLines)

  const added   = diff.filter(d => d.type === 'added').length
  const removed = diff.filter(d => d.type === 'removed').length

  const wrap = document.createElement('div')
  wrap.className = 'diff-modal'

  // Header
  const header = document.createElement('div')
  header.className = 'diff-header'

  const title = document.createElement('div')
  title.className = 'diff-title'
  title.innerHTML =
    `<span class="diff-name-a">${nameA}</span>` +
    `<span class="diff-arrow">→</span>` +
    `<span class="diff-name-b">${nameB}</span>`

  const stats = document.createElement('div')
  stats.className = 'diff-stats'
  stats.innerHTML =
    `<span class="diff-stat-added">+${added}</span>` +
    `<span class="diff-stat-removed">-${removed}</span>`

  header.appendChild(title)
  header.appendChild(stats)

  if (onRestoreA) {
    const restoreBtn = document.createElement('button')
    restoreBtn.className = 'diff-restore-btn'
    restoreBtn.textContent = 'Restore'
    restoreBtn.title = `Restore to: ${nameA}`
    restoreBtn.addEventListener('click', onRestoreA)
    header.appendChild(restoreBtn)
  }

  wrap.appendChild(header)

  // Body
  const body = document.createElement('div')
  body.className = 'diff-body'

  if (added === 0 && removed === 0) {
    const same = document.createElement('div')
    same.className = 'diff-identical'
    same.textContent = 'Files are identical.'
    body.appendChild(same)
  } else {
    const table = document.createElement('table')
    table.className = 'diff-table'

    let lineA = 0, lineB = 0
    for (const d of diff) {
      if (d.type === 'same') { lineA++; lineB++ }
      else if (d.type === 'removed') lineA++
      else lineB++

      const tr = document.createElement('tr')
      tr.className = `diff-row diff-row-${d.type}`

      const tdNumA = document.createElement('td')
      tdNumA.className = 'diff-ln'
      tdNumA.textContent = d.type !== 'added' ? String(lineA) : ''

      const tdNumB = document.createElement('td')
      tdNumB.className = 'diff-ln'
      tdNumB.textContent = d.type !== 'removed' ? String(lineB) : ''

      const tdSign = document.createElement('td')
      tdSign.className = 'diff-sign'
      tdSign.textContent = d.type === 'added' ? '+' : d.type === 'removed' ? '−' : ' '

      const tdCode = document.createElement('td')
      tdCode.className = 'diff-code'
      tdCode.textContent = d.text

      tr.appendChild(tdNumA)
      tr.appendChild(tdNumB)
      tr.appendChild(tdSign)
      tr.appendChild(tdCode)
      body.appendChild(tr)
    }

    body.appendChild(table)
  }

  wrap.appendChild(body)
  return wrap
}
