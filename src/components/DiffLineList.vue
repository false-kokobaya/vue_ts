<script setup lang="ts">
import type { DiffLineLeft, DiffLineRight, UnifiedDiffLine } from '@/composables/useJsonDiff'

defineProps<{
  /** 統一表示のときは unifiedLines、従来は leftLines / rightLines */
  lines: DiffLineLeft[] | DiffLineRight[] | UnifiedDiffLine[]
  /** 統一表示のときは 'unified'、従来は 'left' | 'right' */
  side?: 'left' | 'right' | 'unified'
}>()
</script>

<template>
  <div class="diff-line-list" :class="side ? `diff-line-list--${side}` : ''">
    <div
      v-for="(line, index) in lines"
      :key="index"
      class="diff-line"
      :class="[`diff-line--${line.type}`, line.type === 'removed' && !line.text ? 'diff-line--removed-bar' : '']"
      :data-line-type="line.type"
    >
      <span class="diff-line-number" aria-hidden="true">{{ line.lineNumber }}</span>
      <span class="diff-line-content">{{ line.text || (line.type === 'removed' ? '' : ' ') }}</span>
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

/* 変更 = 黄 */
.diff-line--changed,
.diff-line--changed .diff-line-number,
.diff-line--changed .diff-line-content {
  background-color: #fef08a !important;
}

.diff-line--changed .diff-line-number {
  background-color: #fde047 !important;
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
</style>
