import { computed, type Ref } from 'vue'
import { diffLines } from 'diff'

export type LeftLineType = 'unchanged' | 'removed' | 'changed'
export type RightLineType = 'unchanged' | 'added' | 'changed'

/** 統一差分表示用: 1本のリストで 追加=緑, 変更=黄, 削除=赤バー */
export type UnifiedLineType = 'unchanged' | 'added' | 'changed' | 'removed'

export interface DiffLineLeft {
  lineNumber: number
  text: string
  type: LeftLineType
}

export interface DiffLineRight {
  lineNumber: number
  text: string
  type: RightLineType
}

export interface UnifiedDiffLine {
  lineNumber: number
  text: string
  type: UnifiedLineType
}

export type DiffBlockType = 'add' | 'remove' | 'change'

export interface DiffBlock {
  id: number
  type: DiffBlockType
  baseLines: string[]
  compareLines: string[]
  selected: boolean
}

function splitLines(value: string): string[] {
  if (value === '') return []
  const lines = value.split(/\n/)
  if (lines.length > 1 && lines[lines.length - 1] === '') {
    lines.pop()
  }
  return lines
}

export function useJsonDiff(
  baseText: Ref<string>,
  compareText: Ref<string>,
  selectedBlockIds: Ref<Set<number>>
) {
  const diffResult = computed(() => {
    const base = baseText.value
    const compare = compareText.value
    if (base === '' && compare === '') {
      return {
        leftLines: [] as DiffLineLeft[],
        rightLines: [] as DiffLineRight[],
        unifiedLines: [] as UnifiedDiffLine[],
        blocks: [] as DiffBlock[],
      }
    }
    const changes = diffLines(base, compare)
    const leftLines: DiffLineLeft[] = []
    const rightLines: DiffLineRight[] = []
    const unifiedLines: UnifiedDiffLine[] = []
    const blocks: DiffBlock[] = []
    let blockId = 0
    let leftLineNum = 0
    let rightLineNum = 0
    let unifiedLineNum = 0

    for (let i = 0; i < changes.length; i++) {
      const curr = changes[i]
      if (!curr) continue
      const next = changes[i + 1]
      const currLines = splitLines(curr.value)

      if (curr.added) {
        for (const line of currLines) {
          rightLineNum++
          rightLines.push({ lineNumber: rightLineNum, text: line, type: 'added' })
          unifiedLineNum++
          unifiedLines.push({ lineNumber: unifiedLineNum, text: line, type: 'added' })
        }
        blocks.push({
          id: blockId++,
          type: 'add',
          baseLines: [],
          compareLines: currLines,
          selected: selectedBlockIds.value.has(blockId - 1),
        })
      } else if (curr.removed) {
        if (next && next.added) {
          const nextLinesForChange = splitLines(next.value)
          const maxLen = Math.max(currLines.length, nextLinesForChange.length)
          for (let j = 0; j < maxLen; j++) {
            leftLineNum++
            rightLineNum++
            const leftText = currLines[j] ?? ''
            const rightText = nextLinesForChange[j] ?? ''
            leftLines.push({ lineNumber: leftLineNum, text: leftText, type: 'changed' })
            rightLines.push({ lineNumber: rightLineNum, text: rightText, type: 'changed' })
            unifiedLineNum++
            unifiedLines.push({ lineNumber: unifiedLineNum, text: rightText, type: 'changed' })
          }
          blocks.push({
            id: blockId++,
            type: 'change',
            baseLines: currLines,
            compareLines: nextLinesForChange,
            selected: selectedBlockIds.value.has(blockId - 1),
          })
          i++
        } else {
          for (const line of currLines) {
            leftLineNum++
            leftLines.push({ lineNumber: leftLineNum, text: line, type: 'removed' })
            unifiedLineNum++
            // 画像イメージ: 削除箇所はテキストのない赤いバーとして表示
            unifiedLines.push({ lineNumber: unifiedLineNum, text: '', type: 'removed' })
          }
          blocks.push({
            id: blockId++,
            type: 'remove',
            baseLines: currLines,
            compareLines: [],
            selected: selectedBlockIds.value.has(blockId - 1),
          })
        }
      } else {
        for (const line of currLines) {
          leftLineNum++
          rightLineNum++
          leftLines.push({ lineNumber: leftLineNum, text: line, type: 'unchanged' })
          rightLines.push({ lineNumber: rightLineNum, text: line, type: 'unchanged' })
          unifiedLineNum++
          unifiedLines.push({ lineNumber: unifiedLineNum, text: line, type: 'unchanged' })
        }
      }
    }

    blocks.forEach((b) => {
      b.selected = selectedBlockIds.value.has(b.id)
    })

    return { leftLines, rightLines, unifiedLines, blocks }
  })

  return {
    leftLines: computed(() => diffResult.value.leftLines),
    rightLines: computed(() => diffResult.value.rightLines),
    unifiedLines: computed(() => diffResult.value.unifiedLines),
    blocks: computed(() => diffResult.value.blocks),
  }
}
