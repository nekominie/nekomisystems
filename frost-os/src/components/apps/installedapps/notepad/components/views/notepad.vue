<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { db, type FileItem } from "../../../../../../database/db";
import type { WindowInstance } from "../../../../../data/app";
import { useFileSystemStore } from "../../../explorer/file_system_store";

const props = defineProps<{
  win?: WindowInstance;
}>();

const fs = useFileSystemStore();

// Estado LOCAL e independiente de este documento en esta ventana
const currentFile = ref<FileItem | null>(null);
const fileName = ref<string>("untitled.txt");
const text = ref<string>("");
const isDirty = ref<boolean>(false);
const lastSavedText = ref<string>("");
const statusMessage = ref<string>("");

const wordWrap = ref(true);
const showFindBar = ref(false);
const caseSensitive = ref(false);
const findQuery = ref("");
const replaceQuery = ref("");
const fontSize = ref(15);

const line = ref(1);
const column = ref(1);

const editorRef = ref<HTMLTextAreaElement | null>(null);
const fileInputRef = ref<HTMLInputElement | null>(null);

let statusTimer: number | null = null;
let fileHandle: any = null;

const words = computed(() => {
  const matches = text.value.match(/\S+/g);
  return matches ? matches.length : 0;
});

const chars = computed(() => text.value.length);

watch(text, () => {
  isDirty.value = text.value !== lastSavedText.value;
});

async function loadFileItem(item: FileItem) {
  let content = item.textContent ?? '';

  if (!content && item.assetId) {
    try {
      const asset = await db.assets.get(item.assetId);
      if (asset && asset.data) {
        if (asset.data instanceof Blob) {
          content = await asset.data.text();
        } else if (typeof asset.data === 'string') {
          content = asset.data;
        }
      }
    } catch (err) {
      console.error('Error leyendo asset para notepad:', err);
    }
  }

  currentFile.value = item;
  fileName.value = item.name || 'untitled.txt';
  text.value = content;
  lastSavedText.value = content;
  isDirty.value = false;
  setStatus(`Abierto: ${item.name}`);
  updateCaret();
}

async function initWindowContent() {
  if (props.win?.params?.fileItem) {
    await loadFileItem(props.win.params.fileItem);
  } else if (props.win?.params?.text !== undefined) {
    text.value = props.win.params.text;
    lastSavedText.value = props.win.params.text;
    if (props.win.params.fileName) {
      fileName.value = props.win.params.fileName;
    }
  }
}

watch(
  () => props.win?.params?.fileItem,
  (newFile) => {
    if (newFile) {
      loadFileItem(newFile);
    }
  }
);

function setStatus(message: string) {
  statusMessage.value = message;
  if (statusTimer) window.clearTimeout(statusTimer);
  statusTimer = window.setTimeout(() => {
    statusMessage.value = "";
  }, 2500);
}

function focusEditor() {
  editorRef.value?.focus();
}

function updateCaret() {
  const editor = editorRef.value;
  if (!editor) return;

  const pos = editor.selectionStart ?? 0;
  const before = text.value.slice(0, pos);
  const lastBreak = before.lastIndexOf("\n");

  line.value = before.split("\n").length;
  column.value = pos - lastBreak;
}

function confirmDiscardChanges(actionName: string) {
  if (!isDirty.value) return true;
  return window.confirm(`Tienes cambios sin guardar. ¿Deseas continuar con ${actionName}?`);
}

function resetDocument() {
  currentFile.value = null;
  fileName.value = 'untitled.txt';
  text.value = '';
  lastSavedText.value = '';
  isDirty.value = false;
  fileHandle = null;
  showFindBar.value = false;
  findQuery.value = "";
  replaceQuery.value = "";
  line.value = 1;
  column.value = 1;
}

function newDocument() {
  if (!confirmDiscardChanges("Nuevo")) return;
  resetDocument();
  setStatus("Nuevo documento listo");
  focusEditor();
}

function triggerOpen() {
  if (!confirmDiscardChanges("Abrir")) return;
  fileInputRef.value?.click();
}

function onFileSelected(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    currentFile.value = null;
    text.value = String(reader.result ?? "");
    fileName.value = file.name || "untitled.txt";
    lastSavedText.value = text.value;
    isDirty.value = false;
    fileHandle = null;
    updateCaret();
    setStatus(`Abierto: ${fileName.value}`);
    focusEditor();
  };
  reader.readAsText(file);
  input.value = "";
}

function downloadFile(name: string, content: string) {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  URL.revokeObjectURL(url);
}

async function writeToHandle(handle: any) {
  const writable = await handle.createWritable();
  await writable.write(text.value);
  await writable.close();
}

async function saveAs() {
  const picker = (window as any).showSaveFilePicker;
  if (picker) {
    try {
      const handle = await picker({
        suggestedName: fileName.value,
        types: [
          {
            description: "Archivos de texto",
            accept: { "text/plain": [".txt", ".md", ".log"] },
          },
        ],
      });
      await writeToHandle(handle);
      fileHandle = handle;
      fileName.value = handle.name || fileName.value;
      lastSavedText.value = text.value;
      isDirty.value = false;
      setStatus(`Guardado: ${fileName.value}`);
      return;
    } catch {
      return;
    }
  }

  downloadFile(fileName.value || "untitled.txt", text.value);
  lastSavedText.value = text.value;
  isDirty.value = false;
  setStatus(`Descargado: ${fileName.value}`);
}

async function saveFile() {
  // 1. Si el archivo pertenece al sistema virtual de Frost OS
  if (currentFile.value) {
    const updatedData = {
      textContent: text.value,
      size: new Blob([text.value]).size,
      updatedAt: Date.now(),
    };

    try {
      await db.files.update(currentFile.value.id, updatedData);
      currentFile.value.textContent = text.value;
      currentFile.value.size = updatedData.size;
      currentFile.value.updatedAt = updatedData.updatedAt;

      lastSavedText.value = text.value;
      isDirty.value = false;
      setStatus(`Guardado en Frost OS (${fileName.value})`);

      try {
        await fs.loadAllFiles();
      } catch {}

      return;
    } catch (e) {
      console.error('Error guardando archivo en Notepad:', e);
    }
  }

  // 2. Si tiene un handle nativo del explorador del navegador
  if (fileHandle) {
    try {
      await writeToHandle(fileHandle);
      lastSavedText.value = text.value;
      isDirty.value = false;
      setStatus(`Guardado: ${fileName.value}`);
      return;
    } catch {
      fileHandle = null;
    }
  }

  // 3. Si es un nuevo archivo creado en Frost OS
  try {
    const trimmed = (fileName.value || 'documento.txt').trim();
    const finalName = trimmed.endsWith('.txt') ? trimmed : `${trimmed}.txt`;
    const newFile = await fs.createNewFile('documents', finalName, text.value);
    if (newFile) {
      currentFile.value = newFile;
      fileName.value = newFile.name;
      lastSavedText.value = text.value;
      isDirty.value = false;
      setStatus(`Guardado en Documentos (${newFile.name})`);
      return;
    }
  } catch (err) {
    console.error('Error guardando nuevo archivo en Notepad:', err);
  }

  await saveAs();
}

function selectRange(start: number, end: number) {
  const editor = editorRef.value;
  if (!editor) return;
  focusEditor();
  editor.setSelectionRange(start, end);
  updateCaret();
}

function normalizeForFind(source: string) {
  return caseSensitive.value ? source : source.toLowerCase();
}

function findNext() {
  const editor = editorRef.value;
  const needleRaw = findQuery.value;
  if (!editor || !needleRaw) return;

  const haystack = normalizeForFind(text.value);
  const needle = normalizeForFind(needleRaw);

  const startAt = editor.selectionEnd ?? 0;
  let foundAt = haystack.indexOf(needle, startAt);
  if (foundAt < 0 && startAt > 0) {
    foundAt = haystack.indexOf(needle, 0);
  }

  if (foundAt < 0) {
    setStatus("No matches");
    return;
  }

  selectRange(foundAt, foundAt + needleRaw.length);
  setStatus("Match found");
}

function replaceSelection(start: number, end: number, replacement: string) {
  text.value = `${text.value.slice(0, start)}${replacement}${text.value.slice(end)}`;
  const nextPos = start + replacement.length;
  selectRange(nextPos, nextPos);
}

function replaceOne() {
  const editor = editorRef.value;
  const needleRaw = findQuery.value;
  if (!editor || !needleRaw) return;

  const start = editor.selectionStart ?? 0;
  const end = editor.selectionEnd ?? 0;
  const selected = text.value.slice(start, end);

  if (normalizeForFind(selected) === normalizeForFind(needleRaw) && selected.length) {
    replaceSelection(start, end, replaceQuery.value);
    setStatus("Replaced one");
    return;
  }

  findNext();
}

function escapeRegExp(input: string) {
  return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function replaceAll() {
  if (!findQuery.value) return;

  const from = findQuery.value;
  const to = replaceQuery.value;

  if (!caseSensitive.value) {
    const regex = new RegExp(escapeRegExp(from), "gi");
    const matches = text.value.match(regex);
    if (!matches?.length) {
      setStatus("No matches");
      return;
    }
    text.value = text.value.replace(regex, to);
    setStatus(`Replaced ${matches.length}`);
    return;
  }

  const parts = text.value.split(from);
  if (parts.length <= 1) {
    setStatus("No matches");
    return;
  }
  const count = parts.length - 1;
  text.value = parts.join(to);
  setStatus(`Replaced ${count}`);
}

function selectAll() {
  const editor = editorRef.value;
  if (!editor) return;
  focusEditor();
  editor.select();
  updateCaret();
}

function undoEdit() {
  focusEditor();
  document.execCommand("undo");
}

function redoEdit() {
  focusEditor();
  document.execCommand("redo");
}

function copySelection() {
  const editor = editorRef.value;
  if (!editor) return;

  const start = editor.selectionStart ?? 0;
  const end = editor.selectionEnd ?? 0;
  if (end <= start) return;

  const selected = text.value.slice(start, end);
  navigator.clipboard?.writeText(selected).catch(() => {
    focusEditor();
    document.execCommand("copy");
  });
}

function cutSelection() {
  const editor = editorRef.value;
  if (!editor) return;

  const start = editor.selectionStart ?? 0;
  const end = editor.selectionEnd ?? 0;
  if (end <= start) return;

  const selected = text.value.slice(start, end);
  navigator.clipboard?.writeText(selected).catch(() => {
    focusEditor();
    document.execCommand("cut");
  });

  replaceSelection(start, end, "");
}

async function pasteClipboard() {
  const editor = editorRef.value;
  if (!editor) return;

  try {
    const clip = await navigator.clipboard.readText();
    const start = editor.selectionStart ?? 0;
    const end = editor.selectionEnd ?? 0;
    replaceSelection(start, end, clip);
  } catch {
    focusEditor();
    document.execCommand("paste");
  }
}

function insertDateTime() {
  const editor = editorRef.value;
  if (!editor) return;

  const stamp = new Date().toLocaleString();
  const start = editor.selectionStart ?? 0;
  const end = editor.selectionEnd ?? 0;
  replaceSelection(start, end, stamp);
  setStatus("Date and time inserted");
}

function toggleFindBar() {
  showFindBar.value = !showFindBar.value;
  if (showFindBar.value) {
    setTimeout(() => {
      const element = document.getElementById("notepad-find-input") as HTMLInputElement | null;
      element?.focus();
      element?.select();
    }, 0);
  } else {
    focusEditor();
  }
}

function onEditorKeydown(event: KeyboardEvent) {
  if (event.key === "Tab") {
    event.preventDefault();
    const editor = editorRef.value;
    if (!editor) return;
    const start = editor.selectionStart ?? 0;
    const end = editor.selectionEnd ?? 0;
    replaceSelection(start, end, "  ");
  }
}

function onGlobalShortcuts(event: KeyboardEvent) {
  if (props.win && !props.win.isFocused) return;

  const ctrlOrCmd = event.ctrlKey || event.metaKey;
  if (!ctrlOrCmd) return;

  const key = event.key.toLowerCase();

  if (key === "n") {
    event.preventDefault();
    newDocument();
    return;
  }

  if (key === "o") {
    event.preventDefault();
    triggerOpen();
    return;
  }

  if (key === "s") {
    event.preventDefault();
    if (event.shiftKey) saveAs();
    else saveFile();
    return;
  }

  if (key === "f") {
    event.preventDefault();
    if (!showFindBar.value) showFindBar.value = true;
    setTimeout(() => {
      const element = document.getElementById("notepad-find-input") as HTMLInputElement | null;
      element?.focus();
      element?.select();
    }, 0);
    return;
  }

  if (key === "h") {
    event.preventDefault();
    showFindBar.value = true;
    setTimeout(() => {
      const element = document.getElementById("notepad-replace-input") as HTMLInputElement | null;
      element?.focus();
      element?.select();
    }, 0);
    return;
  }

  if (key === "a") {
    event.preventDefault();
    selectAll();
    return;
  }

  if (key === "w") {
    event.preventDefault();
    wordWrap.value = !wordWrap.value;
    setStatus(wordWrap.value ? "Word wrap on" : "Word wrap off");
  }
}

onMounted(async () => {
  await initWindowContent();
  window.addEventListener("keydown", onGlobalShortcuts);
  updateCaret();
});

onBeforeUnmount(() => {
  window.removeEventListener("keydown", onGlobalShortcuts);
  if (statusTimer) window.clearTimeout(statusTimer);
});
</script>

<template>
  <div class="notepad-app">
    <header class="toolbar-shell">
      <div class="toolbar-row menu-row">
        <button @click="newDocument"><i class="bi bi-file-earmark-plus"></i>Nuevo</button>
        <button @click="triggerOpen"><i class="bi bi-folder2-open"></i>Abrir</button>
        <button @click="saveFile"><i class="bi bi-floppy"></i>Guardar</button>
        <button @click="saveAs"><i class="bi bi-download"></i>Guardar como</button>
        <span class="divider"></span>
        <button @click="undoEdit"><i class="bi bi-arrow-counterclockwise"></i>Deshacer</button>
        <button @click="redoEdit"><i class="bi bi-arrow-clockwise"></i>Rehacer</button>
        <span class="divider"></span>
        <button @click="cutSelection"><i class="bi bi-scissors"></i>Cortar</button>
        <button @click="copySelection"><i class="bi bi-files"></i>Copiar</button>
        <button @click="pasteClipboard"><i class="bi bi-clipboard2-check"></i>Pegar</button>
        <button @click="selectAll"><i class="bi bi-check2-square"></i>Seleccionar todo</button>
        <span class="divider"></span>
        <button @click="toggleFindBar"><i class="bi bi-search"></i>Buscar / Reemplazar</button>
        <button @click="insertDateTime"><i class="bi bi-calendar3"></i>Fecha/Hora</button>
      </div>

      <div class="toolbar-row options-row">
        <label class="filename-field">
          <span>Archivo</span>
          <input v-model="fileName" type="text" />
        </label>

        <label class="toggle-field">
          <input v-model="wordWrap" type="checkbox" />
          <span>Ajuste de línea</span>
        </label>

        <label class="range-field">
          <span>Fuente {{ fontSize }}px</span>
          <input v-model.number="fontSize" type="range" min="12" max="28" />
        </label>

        <label class="toggle-field">
          <input v-model="caseSensitive" type="checkbox" />
          <span>Coincidir mayúsculas</span>
        </label>
      </div>

      <div v-if="showFindBar" class="toolbar-row find-row">
        <input id="notepad-find-input" v-model="findQuery" type="text" placeholder="Buscar..." @keydown.enter.prevent="findNext" />
        <input id="notepad-replace-input" v-model="replaceQuery" type="text" placeholder="Reemplazar por..." @keydown.enter.prevent="replaceOne" />
        <button @click="findNext"><i class="bi bi-arrow-down-circle"></i>Buscar sig.</button>
        <button @click="replaceOne"><i class="bi bi-pencil-square"></i>Reemplazar</button>
        <button @click="replaceAll"><i class="bi bi-ui-checks-grid"></i>Reemplazar todo</button>
        <button class="close-find" @click="showFindBar = false"><i class="bi bi-x-circle"></i>Cerrar</button>
      </div>
    </header>

    <main class="editor-wrap">
      <textarea
        ref="editorRef"
        v-model="text"
        class="editor"
        :style="{ fontSize: `${fontSize}px`, whiteSpace: wordWrap ? 'pre-wrap' : 'pre' }"
        spellcheck="false"
        placeholder="Empieza a escribir aquí..."
        @click="updateCaret"
        @keyup="updateCaret"
        @mouseup="updateCaret"
        @input="updateCaret"
        @keydown="onEditorKeydown"
      ></textarea>
    </main>

    <footer class="statusbar">
      <div class="left">
        <span class="file-name-indicator">
          <i class="bi bi-file-earmark-text text-primary me-1"></i>
          {{ isDirty ? "*" : "" }}{{ fileName }}
        </span>
        <span v-if="currentFile" class="frost-badge">
          <i class="bi bi-hdd-fill me-1"></i>Frost OS: /{{ currentFile.parentId || 'archivos' }}
        </span>
        <span>{{ words }} palabras</span>
        <span>{{ chars }} caracteres</span>
      </div>
      <div class="right">
        <span>Ln {{ line }}, Col {{ column }}</span>
        <span>{{ wordWrap ? "Ajuste activado" : "Sin ajuste" }}</span>
        <span class="status">{{ statusMessage }}</span>
      </div>
    </footer>

    <input ref="fileInputRef" type="file" accept=".txt,.md,.log,.json,.csv,.xml,.html,.css,.js,.ts,.vue,*/*" class="hidden-file-input" @change="onFileSelected" />
  </div>
</template>

<style scoped>
.notepad-app {
  height: 100%;
  width: 100%;
  display: grid;
  grid-template-rows: auto 1fr 30px;
  color: var(--frst-font-normal, rgba(255, 255, 255, 0.88));
  background:
    radial-gradient(140% 100% at 10% 0%, rgba(255, 255, 255, 0.11), rgba(255, 255, 255, 0) 52%),
    linear-gradient(165deg, rgba(37, 37, 42, 0.45), rgba(20, 20, 24, 0.62));
}

.toolbar-shell {
  border-bottom: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(18, 18, 24, 0.4);
  backdrop-filter: blur(18px);
  -webkit-backdrop-filter: blur(18px);
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.toolbar-row {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.toolbar-row button {
  border: 1px solid rgba(255, 255, 255, 0.2);
  background: rgba(255, 255, 255, 0.08);
  color: inherit;
  border-radius: 7px;
  height: 30px;
  padding: 0 10px;
  font-size: 12px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.toolbar-row button:hover {
  background: rgba(255, 255, 255, 0.16);
}

.toolbar-row input[type="text"] {
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: 7px;
  background: rgba(0, 0, 0, 0.22);
  color: inherit;
  height: 30px;
  padding: 0 10px;
  outline: none;
}

.toolbar-row input[type="text"]:focus {
  border-color: rgba(126, 191, 255, 0.8);
  box-shadow: 0 0 0 1px rgba(126, 191, 255, 0.25);
}

.divider {
  width: 1px;
  height: 18px;
  background: rgba(255, 255, 255, 0.2);
  margin: 0 3px;
}

.filename-field,
.toggle-field,
.range-field {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 8px;
  padding: 4px 8px;
  min-height: 30px;
  font-size: 12px;
}

.filename-field input[type="text"] {
  width: 220px;
  height: 24px;
}

.range-field input[type="range"] {
  width: 120px;
}

.find-row input {
  min-width: 180px;
}

.close-find {
  margin-left: auto;
}

.editor-wrap {
  min-height: 0;
  padding: 10px;
  background: rgba(8, 8, 12, 0.14);
}

.editor {
  width: 100%;
  height: 100%;
  resize: none;
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 10px;
  background: rgba(9, 10, 13, 0.44);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  color: rgba(255, 255, 255, 0.94);
  padding: 14px;
  box-sizing: border-box;
  line-height: 1.5;
  font-family: "Consolas", "Courier New", monospace;
  tab-size: 2;
  outline: none;
}

.editor:focus {
  border-color: rgba(126, 191, 255, 0.85);
  box-shadow: inset 0 0 0 1px rgba(126, 191, 255, 0.2);
}

.statusbar {
  border-top: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(13, 13, 16, 0.56);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 10px;
  font-size: 12px;
}

.left,
.right {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.status {
  opacity: 0.85;
  max-width: 240px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.file-name-indicator {
  display: inline-flex;
  align-items: center;
  font-weight: 500;
}

.frost-badge {
  display: inline-flex;
  align-items: center;
  background: rgba(13, 110, 253, 0.2);
  color: #79b8ff;
  border: 1px solid rgba(13, 110, 253, 0.4);
  border-radius: 4px;
  padding: 1px 7px;
  font-size: 11px;
}

.hidden-file-input {
  display: none;
}

@media (max-width: 920px) {
  .notepad-app {
    grid-template-rows: auto 1fr 44px;
  }

  .statusbar {
    flex-direction: column;
    align-items: flex-start;
    justify-content: center;
    gap: 3px;
    padding: 4px 10px;
  }

  .close-find {
    margin-left: 0;
  }
}
</style>
