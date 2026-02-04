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

/**
 * Builds merged text from base and compare, applying only selected diff blocks.
 * - remove block selected: omit those lines from result
 * - add block selected: include compare lines in result
 * - change block selected: use compare lines; otherwise use base lines
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
          const id = blockId++
          if (selected.has(id)) {
            resultLines.push(...nextLinesForChange)
          } else {
            resultLines.push(...currLines)
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
