<script setup lang="ts">
import { ref, computed, nextTick } from 'vue'
import { useJsonDiff } from '@/composables/useJsonDiff'
import { useJsonMerge } from '@/composables/useJsonMerge'
import DiffLineList from '@/components/DiffLineList.vue'

const baseText = ref('')
const compareText = ref('')
const selectedBlockIds = ref<Set<number>>(new Set())

const baseFileInput = ref<HTMLInputElement | null>(null)
const compareFileInput = ref<HTMLInputElement | null>(null)
const baseTextarea = ref<HTMLTextAreaElement | null>(null)
const compareTextarea = ref<HTMLTextAreaElement | null>(null)

let isScrollingFromSync = false

function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error)
    reader.readAsText(file, 'UTF-8')
  })
}

function validateJsonSyntax(text: string): { ok: true } | { ok: false; message: string } {
  if (text.trim() === '') return { ok: true }
  try {
    JSON.parse(text)
    return { ok: true }
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    return { ok: false, message }
  }
}

function resetTextareaScroll() {
  nextTick(() => {
    if (baseTextarea.value) baseTextarea.value.scrollTop = 0
    if (compareTextarea.value) compareTextarea.value.scrollTop = 0
  })
}

async function onBaseFileChange(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (file) {
    const text = await readFileAsText(file)
    const result = validateJsonSyntax(text)
    if (!result.ok) {
      alert(`JSONの構文が不正です。読み込みを中止します。\n\n${result.message}`)
      input.value = ''
      return
    }
    baseText.value = text
    resetTextareaScroll()
  }
  input.value = ''
}

async function onCompareFileChange(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (file) {
    const text = await readFileAsText(file)
    const result = validateJsonSyntax(text)
    if (!result.ok) {
      alert(`JSONの構文が不正です。読み込みを中止します。\n\n${result.message}`)
      input.value = ''
      return
    }
    compareText.value = text
    resetTextareaScroll()
  }
  input.value = ''
}

function onBaseTextareaScroll() {
  if (isScrollingFromSync) return
  isScrollingFromSync = true
  if (baseTextarea.value && compareTextarea.value) {
    compareTextarea.value.scrollTop = baseTextarea.value.scrollTop
    compareTextarea.value.scrollLeft = baseTextarea.value.scrollLeft
  }
  requestAnimationFrame(() => { isScrollingFromSync = false })
}

function onCompareTextareaScroll() {
  if (isScrollingFromSync) return
  isScrollingFromSync = true
  if (baseTextarea.value && compareTextarea.value) {
    baseTextarea.value.scrollTop = compareTextarea.value.scrollTop
    baseTextarea.value.scrollLeft = compareTextarea.value.scrollLeft
  }
  requestAnimationFrame(() => { isScrollingFromSync = false })
}

function triggerBaseFileSelect() {
  baseFileInput.value?.click()
}

function triggerCompareFileSelect() {
  compareFileInput.value?.click()
}

const { leftLines, rightLines, blocks } = useJsonDiff(baseText, compareText, selectedBlockIds)
const { mergedText } = useJsonMerge(baseText, compareText, selectedBlockIds)

/** 現在の選択で結合した結果のJSON検証。エラー時はメッセージを返す */
const mergeValidation = computed(() => {
  const text = mergedText.value
  if (text.trim() === '') return { valid: true as const, message: '' }
  try {
    JSON.parse(text)
    return { valid: true as const, message: '' }
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    return { valid: false as const, message }
  }
})

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
            ref="baseTextarea"
            v-model="baseText"
            class="textarea"
            placeholder="JSONを貼り付けまたはファイルを読み込み"
            spellcheck="false"
            @scroll="onBaseTextareaScroll"
          />
          <div v-if="leftLines.length > 0" class="panel-diff">
            <p class="panel-diff-legend" aria-hidden="true">
              <span class="legend-item legend-added">緑＝追加（ベースにある）</span>
              <span class="legend-item legend-removed">赤＝削除（ベースにない）</span>
              <span class="legend-item legend-changed">黄＝変更</span>
              <span class="legend-item legend-hint">色付きの行をクリックで取り込み選択</span>
            </p>
            <DiffLineList
              :lines="leftLines"
              :selected-block-ids="selectedBlockIds"
              side="left"
              @toggle="toggleBlock"
            />
          </div>
        </div>
        <div class="panel compare-panel">
          <h2 class="panel-title">ファイルB（比較）</h2>
          <textarea
            ref="compareTextarea"
            v-model="compareText"
            class="textarea"
            placeholder="JSONを貼り付けまたはファイルを読み込み"
            spellcheck="false"
            @scroll="onCompareTextareaScroll"
          />
          <div v-if="rightLines.length > 0" class="panel-diff">
            <p class="panel-diff-legend" aria-hidden="true">
              <span class="legend-item legend-added">緑＝追加（比較にある）</span>
              <span class="legend-item legend-removed">赤＝削除（比較にない）</span>
              <span class="legend-item legend-changed">黄＝変更</span>
              <span class="legend-item legend-hint">色付きの行をクリックで取り込み選択</span>
            </p>
            <DiffLineList
              :lines="rightLines"
              :selected-block-ids="selectedBlockIds"
              side="right"
              @toggle="toggleBlock"
            />
          </div>
        </div>
      </div>

      <!-- 差分表示の直下: 結合時のJSONエラー表示 -->
      <div
        v-if="leftLines.length > 0 && !mergeValidation.valid"
        class="merge-error"
        role="alert"
      >
        JSON構文エラー（結合すると不正になります）: {{ mergeValidation.message }}
      </div>

      <section v-if="baseText !== '' || compareText !== ''" class="result-section">
        <div class="result-header">
          <h2 class="result-title">結合結果</h2>
          <button
            type="button"
            class="btn btn-download"
            :disabled="mergedText === '' || !mergeValidation.valid"
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
          placeholder="差分を選択すると結合結果がここに表示されます（ベースを基に表示）"
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
  grid-template-rows: 1fr;
  align-items: stretch;
  gap: 1rem;
  margin-bottom: 1rem;
  min-height: 400px;
}

.panel {
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
}

.panel-title {
  margin: 0 0 0.5rem;
  font-size: 0.875rem;
  font-weight: 600;
}

.textarea {
  flex: 1;
  min-height: 120px;
  padding: 0.75rem;
  font-family: ui-monospace, monospace;
  font-size: 0.8125rem;
  line-height: 1.5;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  resize: none;
}

.panel-diff {
  margin-top: 1rem;
  flex-shrink: 0;
  overflow: auto;
  min-height: 0;
}

.panel-diff-legend {
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
.legend-hint { opacity: 0.85; font-weight: normal; }

.merge-error {
  margin-top: 0.75rem;
  padding: 0.5rem 0.75rem;
  font-size: 0.875rem;
  color: #b91c1c;
  background-color: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 6px;
}

.result-section {
  margin-top: 1.5rem;
  padding-top: 1rem;
  border-top: 1px solid var(--color-border);
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
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
  flex: 1;
  min-height: 320px;
  background: var(--color-background-soft);
  font-family: ui-monospace, monospace;
  font-size: 0.8125rem;
  line-height: 1.5;
}
</style>
