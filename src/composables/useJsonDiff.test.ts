import { describe, it, expect } from 'vitest'
import { ref } from 'vue'
import { useJsonDiff } from './useJsonDiff'

describe('useJsonDiff', () => {
  it('両方空のときは空の行リストとブロックを返す', () => {
    const base = ref('')
    const compare = ref('')
    const selected = ref(new Set<number>())
    const { leftLines, rightLines, blocks } = useJsonDiff(base, compare, selected)

    expect(leftLines.value).toEqual([])
    expect(rightLines.value).toEqual([])
    expect(blocks.value).toEqual([])
  })

  it('同一内容のときは unchanged のみ', () => {
    const json = '{"name":"test"}'
    const base = ref(json)
    const compare = ref(json)
    const selected = ref(new Set<number>())
    const { leftLines, rightLines, blocks } = useJsonDiff(base, compare, selected)

    expect(leftLines.value).toHaveLength(1)
    expect(rightLines.value).toHaveLength(1)
    expect(leftLines.value[0]).toMatchObject({ type: 'unchanged', text: json })
    expect(rightLines.value[0]).toMatchObject({ type: 'unchanged', text: json })
    expect(blocks.value).toEqual([])
  })

  it('ベースにのみある行は左=added(緑)、右=removed(赤)', () => {
    const base = ref('{"a":1}\n{"b":2}')
    const compare = ref('{"a":1}')
    const selected = ref(new Set<number>())
    const { leftLines, rightLines, blocks } = useJsonDiff(base, compare, selected)

    expect(leftLines.value.length).toBeGreaterThanOrEqual(2)
    const removedOnRight = rightLines.value.filter((l) => l.type === 'removed' || (l.type === 'added' && !l.text))
    expect(removedOnRight.length).toBeGreaterThanOrEqual(1)
    expect(blocks.value.some((b) => b.type === 'remove')).toBe(true)
  })

  it('比較にのみある行は左=removed、右=added', () => {
    const base = ref('{"a":1}')
    const compare = ref('{"a":1}\n{"b":2}')
    const selected = ref(new Set<number>())
    const { leftLines, rightLines, blocks } = useJsonDiff(base, compare, selected)

    expect(blocks.value.some((b) => b.type === 'add')).toBe(true)
    const addedOnRight = rightLines.value.filter((l) => l.type === 'added' && l.text)
    expect(addedOnRight.length).toBeGreaterThanOrEqual(1)
  })

  it('同じキーの変更行は changed かつ inlineDiff が付く', () => {
    const base = ref('"name":"田中太郎",')
    const compare = ref('"name":"田中一郎",')
    const selected = ref(new Set<number>())
    const { leftLines, rightLines } = useJsonDiff(base, compare, selected)

    const leftChanged = leftLines.value.filter((l) => l.type === 'changed')
    const rightChanged = rightLines.value.filter((l) => l.type === 'changed')
    expect(leftChanged.length).toBeGreaterThanOrEqual(1)
    expect(rightChanged.length).toBeGreaterThanOrEqual(1)
    expect(leftChanged[0].inlineDiff).toBeDefined()
    expect(rightChanged[0].inlineDiff).toBeDefined()
    const leftHighlight = leftChanged[0].inlineDiff!.filter((s) => s.highlight)
    const rightHighlight = rightChanged[0].inlineDiff!.filter((s) => s.highlight)
    expect(leftHighlight.length).toBeGreaterThanOrEqual(1)
    expect(rightHighlight.length).toBeGreaterThanOrEqual(1)
    const leftHighlightText = leftHighlight.map((s) => s.text).join('')
    const rightHighlightText = rightHighlight.map((s) => s.text).join('')
    expect(leftHighlightText).toContain('太')
    expect(rightHighlightText).toContain('一')
  })

  it('差分行には blockId が付与される', () => {
    const base = ref('{"a":1}')
    const compare = ref('{"a":1}\n{"b":2}')
    const selected = ref(new Set<number>())
    const { leftLines, rightLines, blocks } = useJsonDiff(base, compare, selected)

    expect(blocks.value.length).toBeGreaterThanOrEqual(1)
    const withBlockId = [...leftLines.value, ...rightLines.value].filter((l) => 'blockId' in l && l.blockId !== undefined)
    expect(withBlockId.length).toBeGreaterThanOrEqual(1)
    const blockIds = new Set(blocks.value.map((b) => b.id))
    withBlockId.forEach((line) => {
      if (line.blockId !== undefined) expect(blockIds.has(line.blockId)).toBe(true)
    })
  })

  it('selectedBlockIds が変わると blocks の selected が更新される', () => {
    const base = ref('{"a":1}\n{"b":2}')
    const compare = ref('{"a":1}')
    const selected = ref(new Set<number>())
    const { blocks } = useJsonDiff(base, compare, selected)

    expect(blocks.value.length).toBeGreaterThanOrEqual(1)
    const id = blocks.value[0].id
    expect(blocks.value[0].selected).toBe(false)

    selected.value = new Set([id])
    expect(blocks.value[0].selected).toBe(true)
  })
})
