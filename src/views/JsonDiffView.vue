<script setup lang="ts">
import { ref } from 'vue'
import { useJsonDiff } from '@/composables/useJsonDiff'
import { useJsonMerge } from '@/composables/useJsonMerge'
import DiffLineList from '@/components/DiffLineList.vue'
import MergeControl from '@/components/MergeControl.vue'

const baseText = ref('')
const compareText = ref('')
const selectedBlockIds = ref<Set<number>>(new Set())

const baseFileInput = ref<HTMLInputElement | null>(null)
const compareFileInput = ref<HTMLInputElement | null>(null)

function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error)
    reader.readAsText(file, 'UTF-8')
  })
}

async function onBaseFileChange(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (file) {
    baseText.value = await readFileAsText(file)
  }
  input.value = ''
}

async function onCompareFileChange(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (file) {
    compareText.value = await readFileAsText(file)
  }
  input.value = ''
}

function triggerBaseFileSelect() {
  baseFileInput.value?.click()
}

function triggerCompareFileSelect() {
  compareFileInput.value?.click()
}

const { unifiedLines, blocks } = useJsonDiff(baseText, compareText, selectedBlockIds)
const { mergedText } = useJsonMerge(baseText, compareText, selectedBlockIds)

function toggleBlock(blockId: number) {
  const next = new Set(selectedBlockIds.value)
  if (next.has(blockId)) next.delete(blockId)
  else next.add(blockId)
  selectedBlockIds.value = next
}

function downloadMerged() {
  const text = mergedText.value
  if (text === '') return
  const blob = new Blob([text], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'merged.json'
  a.click()
  URL.revokeObjectURL(url)
}
</script>

<template>
  <div class="json-diff-view">
    <header class="header">
      <h1>JSON 差分比較・結合</h1>
      <div class="load-actions">
        <input
          ref="baseFileInput"
          type="file"
          accept=".json,application/json"
          class="file-input"
          aria-label="ファイルAを選択"
          @change="onBaseFileChange"
        />
        <button type="button" class="btn" @click="triggerBaseFileSelect">
          ファイルAを読み込み
        </button>
        <input
          ref="compareFileInput"
          type="file"
          accept=".json,application/json"
          class="file-input"
          aria-label="ファイルBを選択"
          @change="onCompareFileChange"
        />
        <button type="button" class="btn" @click="triggerCompareFileSelect">
          ファイルBを読み込み
        </button>
      </div>
    </header>

    <main class="main">
      <div class="panels">
        <div class="panel base-panel">
          <h2 class="panel-title">ファイルA（ベース）</h2>
          <textarea
            v-model="baseText"
            class="textarea"
            placeholder="JSONを貼り付けまたはファイルを読み込み"
            spellcheck="false"
          />
        </div>
        <div class="panel compare-panel">
          <h2 class="panel-title">ファイルB（比較）</h2>
          <textarea
            v-model="compareText"
            class="textarea"
            placeholder="JSONを貼り付けまたはファイルを読み込み"
            spellcheck="false"
          />
        </div>
      </div>

      <section v-if="unifiedLines.length > 0" class="unified-diff-section">
        <h2 class="diff-section-title">差分表示（行番号・色付き）</h2>
        <p class="diff-legend" aria-hidden="true">
          <span class="legend-item legend-added">緑＝追加</span>
          <span class="legend-item legend-changed">黄＝変更</span>
          <span class="legend-item legend-removed">赤＝削除</span>
        </p>
        <DiffLineList :lines="unifiedLines" side="unified" />
      </section>

      <MergeControl v-if="blocks.length > 0" :blocks="blocks" @toggle="toggleBlock" />

      <section v-if="baseText !== '' || compareText !== ''" class="result-section">
        <div class="result-header">
          <h2 class="result-title">結合結果</h2>
          <button
            type="button"
            class="btn btn-download"
            :disabled="mergedText === ''"
            aria-label="結合結果をダウンロード"
            @click="downloadMerged"
          >
            結合結果をダウンロード
          </button>
        </div>
        <textarea
          :value="mergedText"
          class="textarea result-textarea"
          readonly
          placeholder="差分を選択すると結合結果がここに表示されます"
          spellcheck="false"
          aria-label="結合結果"
        />
      </section>
    </main>
  </div>
</template>

<style scoped>
.json-diff-view {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.header {
  padding: 1rem 1.5rem;
  border-bottom: 1px solid var(--color-border);
}

.header h1 {
  margin: 0 0 0.75rem;
  font-size: 1.25rem;
}

.load-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  align-items: center;
}

.file-input {
  position: absolute;
  width: 0;
  height: 0;
  opacity: 0;
  pointer-events: none;
}

.btn {
  padding: 0.5rem 1rem;
  font-size: 0.875rem;
  cursor: pointer;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  background: var(--color-background-soft);
}

.btn:hover {
  background: var(--color-background-muted);
}

.main {
  flex: 1;
  padding: 1rem 1.5rem;
  overflow: auto;
}

.panels {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  margin-bottom: 1rem;
}

.panel {
  display: flex;
  flex-direction: column;
  min-height: 200px;
}

.panel-title {
  margin: 0 0 0.5rem;
  font-size: 0.875rem;
  font-weight: 600;
}

.textarea {
  flex: 1;
  min-height: 200px;
  padding: 0.75rem;
  font-family: ui-monospace, monospace;
  font-size: 0.8125rem;
  line-height: 1.5;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  resize: vertical;
}

.unified-diff-section {
  margin-top: 1.5rem;
  padding-top: 1rem;
  border-top: 1px solid var(--color-border);
}

.diff-section-title {
  margin: 0 0 0.5rem;
  font-size: 1rem;
  font-weight: 600;
}

.diff-legend {
  margin: 0 0 0.5rem;
  font-size: 0.75rem;
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
}

.legend-item {
  font-weight: 500;
}

.legend-removed { color: #991b1b; }
.legend-added { color: #166534; }
.legend-changed { color: #854d0e; }

.result-section {
  margin-top: 1.5rem;
  padding-top: 1rem;
  border-top: 1px solid var(--color-border);
}

.result-header {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.5rem;
}

.result-title {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
}

.btn-download {
  margin-left: auto;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.result-textarea {
  min-height: 180px;
  background: var(--color-background-soft);
}
</style>
