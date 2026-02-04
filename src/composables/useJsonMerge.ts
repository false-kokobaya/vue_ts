import { computed, type Ref } from 'vue'
import { diffLines } from 'diff'

function splitLines(value: string): string[] {
  if (value === '') return []
  const lines = value.split(/\n/)
  if (lines.length > 1 && lines[lines.length - 1] === '') {
    lines.pop()
  }
  return lines
}

function isSimilar(line1: string, line2: string): boolean {
  const keyMatch1 = line1.match(/"([^"]+)"\s*:/)
  const keyMatch2 = line2.match(/"([^"]+)"\s*:/)
  return Boolean(keyMatch1 && keyMatch2 && keyMatch1[1] === keyMatch2[1])
}

/**
 * Builds merged text from base and compare, applying only selected diff blocks.
 * Block order must match useJsonDiff: change blocks first, then remove, then add.
 */
export function useJsonMerge(
  baseText: Ref<string>,
  compareText: Ref<string>,
  selectedBlockIds: Ref<Set<number>>
) {
  const mergedText = computed(() => {
    const base = baseText.value
    const compare = compareText.value
    const selected = selectedBlockIds.value
    if (base === '' && compare === '') return ''
    const changes = diffLines(base, compare)
    const resultLines: string[] = []
    let blockId = 0

    for (let i = 0; i < changes.length; i++) {
      const curr = changes[i]
      if (!curr) continue
      const next = changes[i + 1]
      const currLines = splitLines(curr.value)

      if (curr.added) {
        const id = blockId++
        if (selected.has(id)) {
          resultLines.push(...currLines)
        }
      } else if (curr.removed) {
        if (next && next.added) {
          const nextLinesForChange = splitLines(next.value)
          const usedRemoved = new Set<number>()
          const usedAdded = new Set<number>()

          for (let rIdx = 0; rIdx < currLines.length; rIdx++) {
            const removedLine = currLines[rIdx]
            if (!removedLine) continue
            for (let aIdx = 0; aIdx < nextLinesForChange.length; aIdx++) {
              const addedLine = nextLinesForChange[aIdx]
              if (!addedLine) continue
              if (!usedAdded.has(aIdx) && isSimilar(removedLine, addedLine)) {
                const id = blockId++
                if (selected.has(id)) {
                  resultLines.push(addedLine)
                } else {
                  resultLines.push(removedLine)
                }
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
              const id = blockId++
              if (!selected.has(id)) {
                resultLines.push(removedLine)
              }
            }
          }
          for (let aIdx = 0; aIdx < nextLinesForChange.length; aIdx++) {
            if (!usedAdded.has(aIdx)) {
              const addedLine = nextLinesForChange[aIdx]
              if (!addedLine) continue
              const id = blockId++
              if (selected.has(id)) {
                resultLines.push(addedLine)
              }
            }
          }
          i++
        } else {
          const id = blockId++
          if (!selected.has(id)) {
            resultLines.push(...currLines)
          }
        }
      } else {
        resultLines.push(...currLines)
      }
    }

    return resultLines.join('\n')
  })

  return { mergedText }
}
