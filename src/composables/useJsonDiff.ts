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
          
          // 類似度判定用の関数（簡易版）
          const isSimilar = (line1: string, line2: string): boolean => {
            const keyMatch1 = line1.match(/"([^"]+)"\s*:/)
            const keyMatch2 = line2.match(/"([^"]+)"\s*:/)
            return Boolean(keyMatch1 && keyMatch2 && keyMatch1[1] === keyMatch2[1])
          }
          
          const usedRemoved = new Set<number>()
          const usedAdded = new Set<number>()
          
         // マッチング: 削除行と追加行でキーが同じものをペアにする
          for (let rIdx = 0; rIdx < currLines.length; rIdx++) {
            const removedLine = currLines[rIdx]  // ← この行を追加
            if (!removedLine) continue  // ← この行を追加
            
            for (let aIdx = 0; aIdx < nextLinesForChange.length; aIdx++) {
              const addedLine = nextLinesForChange[aIdx]  // ← この行を追加
              if (!addedLine) continue  // ← この行を追加
              
              if (!usedAdded.has(aIdx) && isSimilar(removedLine, addedLine)) {  
                // 変更として扱う
                leftLineNum++
                rightLineNum++
                leftLines.push({ lineNumber: leftLineNum, text: removedLine, type: 'changed' })  
                rightLines.push({ lineNumber: rightLineNum, text: addedLine, type: 'changed' })  
                unifiedLineNum++
                unifiedLines.push({ lineNumber: unifiedLineNum, text: addedLine, type: 'changed' })  
                
                blocks.push({
                  id: blockId++,
                  type: 'change',
                  baseLines: [removedLine], 
                  compareLines: [addedLine],  
                  selected: selectedBlockIds.value.has(blockId - 1),
                })
                
                usedRemoved.add(rIdx)
                usedAdded.add(aIdx)
                break
              }
            }
          }
          
          // マッチしなかった削除行 → 削除として扱う
          for (let rIdx = 0; rIdx < currLines.length; rIdx++) {
            if (!usedRemoved.has(rIdx)) {
              const removedLine = currLines[rIdx]
              if (!removedLine) continue

              leftLineNum++
              leftLines.push({ lineNumber: leftLineNum, text: removedLine, type: 'removed' })
              unifiedLineNum++
              unifiedLines.push({ lineNumber: unifiedLineNum, text: '', type: 'removed' })
              
              blocks.push({
                id: blockId++,
                type: 'remove',
                baseLines: [removedLine],
                compareLines: [],
                selected: selectedBlockIds.value.has(blockId - 1),
              })
            }
          }
          
          // マッチしなかった追加行 → 追加として扱う
          for (let aIdx = 0; aIdx < nextLinesForChange.length; aIdx++) {
            if (!usedAdded.has(aIdx)) {
              const addedLine = nextLinesForChange[aIdx]  
              if (!addedLine) continue  
              
              rightLineNum++
              rightLines.push({ lineNumber: rightLineNum, text: addedLine, type: 'added' })
              unifiedLineNum++
              unifiedLines.push({ lineNumber: unifiedLineNum, text: addedLine, type: 'added' })
              
              blocks.push({
                id: blockId++,
                type: 'add',
                baseLines: [],
                compareLines: [addedLine],
                selected: selectedBlockIds.value.has(blockId - 1),
              })
            }
          }
          
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
