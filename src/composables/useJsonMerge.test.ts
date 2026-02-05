import { describe, it, expect } from 'vitest'
import { ref } from 'vue'
import { useJsonDiff } from './useJsonDiff'
import { useJsonMerge } from './useJsonMerge'

describe('useJsonMerge', () => {
  it('両方空のときは空文字を返す', () => {
    const base = ref('')
    const compare = ref('')
    const selected = ref(new Set<number>())
    const { mergedText } = useJsonMerge(base, compare, selected)
    expect(mergedText.value).toBe('')
  })

  it('ベースのみのときはベースの内容を返す', () => {
    const base = ref('{"a":1}')
    const compare = ref('')
    const selected = ref(new Set<number>())
    const { mergedText } = useJsonMerge(base, compare, selected)
    expect(mergedText.value).toBe('{"a":1}')
  })

  it('比較のみのときは空（選択なしなら取り込まない）', () => {
    const base = ref('')
    const compare = ref('{"b":2}')
    const selected = ref(new Set<number>())
    const { mergedText } = useJsonMerge(base, compare, selected)
    expect(mergedText.value).toBe('')
  })

  it('同一内容のときはベースと同じ', () => {
    const json = '{"name":"test"}'
    const base = ref(json)
    const compare = ref(json)
    const selected = ref(new Set<number>())
    const { mergedText } = useJsonMerge(base, compare, selected)
    expect(mergedText.value).toBe(json)
  })

  it('追加ブロックを選択すると比較の行が取り込まれる', () => {
    const base = ref('{"a":1}')
    const compare = ref('{"a":1}\n{"b":2}')
    const selected = ref(new Set<number>())
    const { blocks } = useJsonDiff(base, compare, selected)
    const addBlock = blocks.value.find((b) => b.type === 'add')
    const addBlockId = addBlock?.id ?? 0
    selected.value = new Set([addBlockId])
    const { mergedText } = useJsonMerge(base, compare, selected)
    expect(mergedText.value).toContain('{"a":1}')
    expect(mergedText.value).toContain('{"b":2}')
  })

  it('削除ブロックを選択しないとベースの行が残る', () => {
    const base = ref('{"a":1}\n{"b":2}')
    const compare = ref('{"a":1}')
    const selected = ref(new Set<number>()) // 削除ブロックを選択しない
    const { mergedText } = useJsonMerge(base, compare, selected)
    expect(mergedText.value).toContain('{"b":2}')
  })

  it('削除ブロックを選択するとその行は結果に含まれない', () => {
    const base = ref('{"a":1}\n{"b":2}')
    const compare = ref('{"a":1}')
    const selected = ref(new Set<number>())
    const { blocks } = useJsonDiff(base, compare, selected)
    const removeBlock = blocks.value.find((b) => b.type === 'remove')
    const removeBlockId = removeBlock?.id ?? 0
    selected.value = new Set([removeBlockId])
    const { mergedText } = useJsonMerge(base, compare, selected)
    expect(mergedText.value).not.toContain('{"b":2}')
    expect(mergedText.value).toContain('{"a":1}')
  })

  it('変更ブロックを選択すると比較側の行になる', () => {
    const base = ref('"name":"田中太郎",')
    const compare = ref('"name":"田中一郎",')
    const selected = ref(new Set<number>([0]))
    const { mergedText } = useJsonMerge(base, compare, selected)
    expect(mergedText.value).toContain('田中一郎')
    expect(mergedText.value).not.toContain('田中太郎')
  })

  it('変更ブロックを選択しないとベース側の行のまま', () => {
    const base = ref('"name":"田中太郎",')
    const compare = ref('"name":"田中一郎",')
    const selected = ref(new Set<number>())
    const { mergedText } = useJsonMerge(base, compare, selected)
    expect(mergedText.value).toContain('田中太郎')
    expect(mergedText.value).not.toContain('田中一郎')
  })

  it('結合結果が有効なJSONになるケース', () => {
    const base = ref('{"a":1}')
    const compare = ref('{"a":1,"b":2}')
    const selected = ref(new Set<number>())
    const { blocks } = useJsonDiff(base, compare, selected)
    const changeBlock = blocks.value.find((b) => b.type === 'change')
    if (changeBlock) selected.value = new Set([changeBlock.id])
    const { mergedText } = useJsonMerge(base, compare, selected)
    expect(() => JSON.parse(mergedText.value)).not.toThrow()
  })
})
