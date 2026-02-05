import { computed, type Ref } from 'vue'
import { diffLines } from 'diff'

/** ベース側: ある＝緑(added)、ない＝赤(removed)、変更＝黄(changed) */
export type LeftLineType = 'unchanged' | 'removed' | 'changed' | 'added'
/** 比較側: ある＝緑(added)、ない＝赤(removed)、変更＝黄(changed) */
export type RightLineType = 'unchanged' | 'removed' | 'added' | 'changed'

/** 統一差分表示用: 1本のリストで 追加=緑, 変更=黄, 削除=赤バー */
export type UnifiedLineType = 'unchanged' | 'added' | 'changed' | 'removed'

export interface DiffLineLeft {
  lineNumber: number
  text: string
  type: LeftLineType
  /** クリックで取り込み選択するブロックID。未設定は選択不可行 */
  blockId?: number
}

export interface DiffLineRight {
  lineNumber: number
  text: string
  type: RightLineType
  /** クリックで取り込み選択するブロックID。未設定は選択不可行 */
  blockId?: number
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

/**
 * 行をそろえた差分: 1行 = ベース1セル + 比較1セル。
 * ベースにあって比較にない → ベース=緑(追加)、比較=赤(削除)。
 * 比較にあってベースにない → ベース=赤(削除)、比較=緑(追加)。
 */
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
        const id = blockId
        blocks.push({
          id: blockId++,
          type: 'add',
          baseLines: [],
          compareLines: currLines,
          selected: selectedBlockIds.value.has(id),
        })
        for (const line of currLines) {
          leftLines.push({ lineNumber: 0, text: '', type: 'removed', blockId: id })
          rightLines.push({ lineNumber: 0, text: line, type: 'added', blockId: id })
          unifiedLineNum++
          unifiedLines.push({ lineNumber: unifiedLineNum, text: line, type: 'added' })
        }
      } else if (curr.removed) {
        if (next && next.added) {
          const nextLinesForChange = splitLines(next.value)
          const isSimilar = (line1: string, line2: string): boolean => {
            const keyMatch1 = line1.match(/"([^"]+)"\s*:/)
            const keyMatch2 = line2.match(/"([^"]+)"\s*:/)
            return Boolean(keyMatch1 && keyMatch2 && keyMatch1[1] === keyMatch2[1])
          }
          const usedRemoved = new Set<number>()
          const usedAdded = new Set<number>()

          for (let rIdx = 0; rIdx < currLines.length; rIdx++) {
            const removedLine = currLines[rIdx]
            if (!removedLine) continue
            for (let aIdx = 0; aIdx < nextLinesForChange.length; aIdx++) {
              const addedLine = nextLinesForChange[aIdx]
              if (!addedLine) continue
              if (!usedAdded.has(aIdx) && isSimilar(removedLine, addedLine)) {
                const id = blockId
                blocks.push({
                  id: blockId++,
                  type: 'change',
                  baseLines: [removedLine],
                  compareLines: [addedLine],
                  selected: selectedBlockIds.value.has(id),
                })
                leftLineNum++
                rightLineNum++
                leftLines.push({ lineNumber: leftLineNum, text: removedLine, type: 'changed', blockId: id })
                rightLines.push({ lineNumber: rightLineNum, text: addedLine, type: 'changed', blockId: id })
                unifiedLineNum++
                unifiedLines.push({ lineNumber: unifiedLineNum, text: addedLine, type: 'changed' })
                usedRemoved.add(rIdx)
                usedAdded.add(aIdx)
                break
              }
            }
          }

          for (let rIdx = 0; rIdx < currLines.length; rIdx++) {
            if (!usedRemoved.has(rIdx)) {
              const removedLine = currLines[rIdx]
              if (!removedLine) continue
              const id = blockId
              blocks.push({
                id: blockId++,
                type: 'remove',
                baseLines: [removedLine],
                compareLines: [],
                selected: selectedBlockIds.value.has(id),
              })
              leftLines.push({ lineNumber: 0, text: removedLine, type: 'added', blockId: id })
              rightLines.push({ lineNumber: 0, text: '', type: 'removed', blockId: id })
              unifiedLineNum++
              unifiedLines.push({ lineNumber: unifiedLineNum, text: '', type: 'removed' })
            }
          }

          for (let aIdx = 0; aIdx < nextLinesForChange.length; aIdx++) {
            if (!usedAdded.has(aIdx)) {
              const addedLine = nextLinesForChange[aIdx]
              if (!addedLine) continue
              const id = blockId
              blocks.push({
                id: blockId++,
                type: 'add',
                baseLines: [],
                compareLines: [addedLine],
                selected: selectedBlockIds.value.has(id),
              })
              leftLines.push({ lineNumber: 0, text: '', type: 'removed', blockId: id })
              rightLines.push({ lineNumber: 0, text: addedLine, type: 'added', blockId: id })
              unifiedLineNum++
              unifiedLines.push({ lineNumber: unifiedLineNum, text: addedLine, type: 'added' })
            }
          }
          i++
        } else {
          const id = blockId
          blocks.push({
            id: blockId++,
            type: 'remove',
            baseLines: currLines,
            compareLines: [],
            selected: selectedBlockIds.value.has(id),
          })
          for (const line of currLines) {
            leftLines.push({ lineNumber: 0, text: line, type: 'added', blockId: id })
            rightLines.push({ lineNumber: 0, text: '', type: 'removed', blockId: id })
            unifiedLineNum++
            unifiedLines.push({ lineNumber: unifiedLineNum, text: '', type: 'removed' })
          }
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
