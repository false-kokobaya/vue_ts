<script setup lang="ts">
import type { DiffBlock } from '@/composables/useJsonDiff'

defineProps<{
  blocks: DiffBlock[]
}>()

const emit = defineEmits<{
  toggle: [blockId: number]
}>()

function toggleBlock(blockId: number) {
  emit('toggle', blockId)
}

function blockLabel(block: DiffBlock): string {
  switch (block.type) {
    case 'add':
      return `追加 (${block.compareLines.length} 行)`
    case 'remove':
      return `削除 (${block.baseLines.length} 行)`
    case 'change':
      return `変更 (${block.baseLines.length} → ${block.compareLines.length} 行)`
    default:
      return ''
  }
}
</script>

<template>
  <div class="merge-control">
    <h3 class="merge-control-title">差分を選択して結合</h3>
    <p class="merge-control-desc">取り込みたい差分の、各ブロックの<strong class="merge-action-label">「取り込む」</strong>にチェックを入れてください。</p>
    <ul class="block-list" aria-label="差分ブロック一覧">
      <li
        v-for="block in blocks"
        :key="block.id"
        class="block-item"
        :class="`block-item--${block.type}`"
      >
        <label class="block-label">
          <input
            type="checkbox"
            :checked="block.selected"
            :aria-label="`ブロック ${block.id + 1}: ${blockLabel(block)} を取り込む`"
            @change="toggleBlock(block.id)"
          />
          <span class="merge-action-text">取り込む</span>
          <span class="block-label-text">{{ blockLabel(block) }}</span>
        </label>
        <span class="block-badge" :aria-hidden="true">{{ block.type === 'add' ? '追加' : block.type === 'remove' ? '削除' : '変更' }}</span>
      </li>
    </ul>
    <p v-if="blocks.length === 0" class="block-list-empty">差分がありません。</p>
  </div>
</template>

<style scoped>
.merge-control {
  margin-top: 1rem;
  padding: 1rem;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  background: var(--color-background-soft);
}

.merge-control-title {
  margin: 0 0 0.5rem;
  font-size: 1rem;
  font-weight: 600;
}

.merge-control-desc {
  margin: 0 0 0.75rem;
  font-size: 0.875rem;
  color: var(--color-text);
  opacity: 0.9;
}

.merge-action-label {
  font-weight: 600;
  color: var(--color-heading);
}

.merge-action-text {
  font-weight: 600;
  font-size: 0.875rem;
  min-width: 4.5em;
  color: var(--color-heading);
}

.block-list {
  list-style: none;
  margin: 0;
  padding: 0;
}

.block-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0;
  border-bottom: 1px solid var(--color-border);
}

.block-item:last-child {
  border-bottom: none;
}

.block-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  flex: 1;
}

.block-label-text {
  font-size: 0.875rem;
}

.block-badge {
  font-size: 0.75rem;
  padding: 0.2rem 0.5rem;
  border-radius: 4px;
  flex-shrink: 0;
}


.block-item--add .block-badge {
  background-color: #bbf7d0;
  color: #166534;
}

.block-item--remove .block-badge {
  background-color: #fecaca;
  color: #991b1b;
}

.block-item--change .block-badge {
  background-color: #fef08a;
  color: #854d0e;
}

.block-list-empty {
  margin: 0;
  font-size: 0.875rem;
  color: var(--color-text);
  opacity: 0.8;
}
</style>
