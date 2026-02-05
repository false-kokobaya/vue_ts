<script setup lang="ts">
import type { DiffLineLeft, DiffLineRight, UnifiedDiffLine } from '@/composables/useJsonDiff'

const props = defineProps<{
  /** 統一表示のときは unifiedLines、従来は leftLines / rightLines */
  lines: DiffLineLeft[] | DiffLineRight[] | UnifiedDiffLine[]
  /** 統一表示のときは 'unified'、従来は 'left' | 'right' */
  side?: 'left' | 'right' | 'unified'
  /** 取り込み選択されているブロックID（クリックでトグル用） */
  selectedBlockIds?: Set<number>
}>()

const emit = defineEmits<{
  toggle: [blockId: number]
}>()

function isSelectableLine(line: DiffLineLeft | DiffLineRight | UnifiedDiffLine): line is (DiffLineLeft | DiffLineRight) & { blockId: number } {
  return 'blockId' in line && typeof line.blockId === 'number'
}

function isSelected(line: DiffLineLeft | DiffLineRight | UnifiedDiffLine): boolean {
  if (!isSelectableLine(line) || !props.selectedBlockIds) return false
  return props.selectedBlockIds.has(line.blockId)
}

function onLineClick(line: DiffLineLeft | DiffLineRight | UnifiedDiffLine) {
  if (!isSelectableLine(line)) return
  emit('toggle', line.blockId)
}
</script>

<template>
  <div class="diff-line-list" :class="side ? `diff-line-list--${side}` : ''">
    <div
      v-for="(line, index) in lines"
      :key="index"
      class="diff-line"
      :class="[
        `diff-line--${line.type}`,
        line.type === 'removed' && !line.text ? 'diff-line--removed-bar' : '',
        isSelectableLine(line) ? 'diff-line--selectable' : '',
        isSelectableLine(line) && isSelected(line) ? 'diff-line--selected' : ''
      ]"
      :data-line-type="line.type"
      role="button"
      :tabindex="isSelectableLine(line) ? 0 : undefined"
      :aria-pressed="isSelectableLine(line) ? isSelected(line) : undefined"
      :aria-label="isSelectableLine(line) ? (isSelected(line) ? '取り込み済み。クリックで解除' : 'クリックで取り込み') : undefined"
      @click="onLineClick(line)"
      @keydown.enter="onLineClick(line)"
      @keydown.space.prevent="onLineClick(line)"
    >
      <span class="diff-line-number" aria-hidden="true">{{ line.type === 'removed' || line.lineNumber === 0 ? '' : line.lineNumber }}</span>
      <span class="diff-line-content">
        <template v-if="line.type === 'changed' && 'inlineDiff' in line && line.inlineDiff?.length">
          <span
            v-for="(seg, segIdx) in (line as { inlineDiff: { text: string; highlight: boolean }[] }).inlineDiff"
            :key="segIdx"
            :class="{ 'diff-line-inline-highlight': seg.highlight }"
          >{{ seg.text }}</span>
        </template>
        <template v-else>{{ line.text || (line.type === 'removed' ? '' : ' ') }}</template>
      </span>
    </div>
  </div>
</template>

<style scoped>
.diff-line-list {
  font-family: ui-monospace, monospace;
  font-size: 0.8125rem;
  line-height: 1.5;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  overflow: auto;
  min-height: 200px;
}

.diff-line {
  display: flex;
  min-height: 1.5em;
  white-space: pre;
  /* デフォルトは透過（unchanged 用） */
  background-color: transparent;
}

.diff-line-number {
  flex-shrink: 0;
  min-width: 3em;
  padding: 0 0.5rem;
  text-align: right;
  color: var(--color-text);
  opacity: 0.75;
  user-select: none;
  border-right: 1px solid var(--color-border);
}

.diff-line-content {
  flex: 1;
  padding: 0 0.5rem;
  overflow-x: auto;
}

/* 削除 = 赤（行全体・行番号・内容の両方に適用） */
.diff-line--removed,
.diff-line--removed .diff-line-number,
.diff-line--removed .diff-line-content {
  background-color: #fecaca !important;
}

.diff-line--removed .diff-line-number {
  background-color: #fca5a5 !important;
}

/* 削除の空行 = テキストのない赤いバー（画像イメージ） */
.diff-line--removed-bar {
  min-height: 1.25em;
}

.diff-line--removed-bar .diff-line-content {
  min-width: 1px;
}

/* 変更 = 行全体は薄い黄、変更箇所は濃い黄（インライン） */
.diff-line--changed,
.diff-line--changed .diff-line-number,
.diff-line--changed .diff-line-content {
  background-color: #fef9c3 !important; /* 薄い黄 */
}

.diff-line--changed .diff-line-number {
  background-color: #fef08a !important;
}

.diff-line--changed .diff-line-inline-highlight {
  background-color: #eab308 !important; /* 濃い黄（変更箇所のみ） */
}

/* 追加 = 緑 */
.diff-line--added,
.diff-line--added .diff-line-number,
.diff-line--added .diff-line-content {
  background-color: #bbf7d0 !important;
}

.diff-line--added .diff-line-number {
  background-color: #86efac !important;
}

.diff-line--unchanged .diff-line-number {
  background-color: transparent;
}

.diff-line--selectable {
  cursor: pointer;
}

.diff-line--selectable:hover {
  filter: brightness(0.97);
}

.diff-line--selected {
  outline: 2px solid var(--vt-c-indigo, #2c3e50);
  outline-offset: -2px;
}
</style>
