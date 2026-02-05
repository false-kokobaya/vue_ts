import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import DiffLineList from './DiffLineList.vue'
import type { DiffLineLeft, DiffLineRight } from '@/composables/useJsonDiff'

describe('DiffLineList', () => {
  it('行リストを描画する', () => {
    const lines: DiffLineLeft[] = [
      { lineNumber: 1, text: '{"a":1}', type: 'unchanged' },
      { lineNumber: 2, text: '{"b":2}', type: 'added', blockId: 0 },
    ]
    const wrapper = mount(DiffLineList, {
      props: { lines, side: 'left' },
    })
    const rows = wrapper.findAll('.diff-line')
    expect(rows).toHaveLength(2)
    expect(rows[0].find('.diff-line-content').text()).toBe('{"a":1}')
    expect(rows[1].find('.diff-line-content').text()).toBe('{"b":2}')
  })

  it('side でクラスが付く', () => {
    const lines: DiffLineLeft[] = [{ lineNumber: 1, text: 'x', type: 'unchanged' }]
    const wrapper = mount(DiffLineList, {
      props: { lines, side: 'right' },
    })
    expect(wrapper.find('.diff-line-list').classes()).toContain('diff-line-list--right')
  })

  it('blockId がある行は selectable クラスが付く', () => {
    const lines: DiffLineLeft[] = [
      { lineNumber: 1, text: 'x', type: 'unchanged' },
      { lineNumber: 0, text: 'y', type: 'added', blockId: 0 },
    ]
    const wrapper = mount(DiffLineList, {
      props: { lines, side: 'left' },
    })
    const rows = wrapper.findAll('.diff-line')
    expect(rows[0].classes()).not.toContain('diff-line--selectable')
    expect(rows[1].classes()).toContain('diff-line--selectable')
  })

  it('selectedBlockIds に含まれる blockId の行は selected クラスが付く', () => {
    const lines: DiffLineLeft[] = [
      { lineNumber: 0, text: 'y', type: 'added', blockId: 0 },
    ]
    const wrapper = mount(DiffLineList, {
      props: { lines, side: 'left', selectedBlockIds: new Set([0]) },
    })
    expect(wrapper.find('.diff-line').classes()).toContain('diff-line--selected')
  })

  it('クリックで toggle が emit される', async () => {
    const lines: DiffLineLeft[] = [
      { lineNumber: 0, text: 'z', type: 'added', blockId: 1 },
    ]
    const wrapper = mount(DiffLineList, {
      props: { lines, side: 'left', selectedBlockIds: new Set<number>() },
    })
    await wrapper.find('.diff-line').trigger('click')
    expect(wrapper.emitted('toggle')).toBeTruthy()
    expect(wrapper.emitted('toggle')![0]).toEqual([1])
  })

  it('blockId のない行をクリックしても toggle は emit されない', async () => {
    const lines: DiffLineLeft[] = [
      { lineNumber: 1, text: 'x', type: 'unchanged' },
    ]
    const wrapper = mount(DiffLineList, {
      props: { lines, side: 'left' },
    })
    await wrapper.find('.diff-line').trigger('click')
    expect(wrapper.emitted('toggle')).toBeFalsy()
  })

  it('変更行で inlineDiff があるときはセグメント表示', () => {
    const lines: DiffLineRight[] = [
      {
        lineNumber: 1,
        text: '"name":"田中一郎",',
        type: 'changed',
        blockId: 0,
        inlineDiff: [
          { text: '"name":"田中', highlight: false },
          { text: '一郎', highlight: true },
          { text: '",', highlight: false },
        ],
      },
    ]
    const wrapper = mount(DiffLineList, {
      props: { lines, side: 'right' },
    })
    const content = wrapper.find('.diff-line-content')
    expect(content.text()).toBe('"name":"田中一郎",')
    const highlights = content.findAll('.diff-line-inline-highlight')
    expect(highlights).toHaveLength(1)
    expect(highlights[0].text()).toBe('一郎')
  })
})
