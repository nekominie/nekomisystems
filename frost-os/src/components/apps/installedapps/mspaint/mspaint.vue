<script lang="ts" setup>
import { computed, onMounted, ref } from "vue";

type Tool = "pencil" | "brush" | "eraser" | "fill" | "line" | "rect" | "ellipse";
type Point = { x: number; y: number };

const canvasRef = ref<HTMLCanvasElement | null>(null);
const fileInputRef = ref<HTMLInputElement | null>(null);

const activeTool = ref<Tool>("brush");
const brushSize = ref(6);
const primaryColor = ref("#000000");
const secondaryColor = ref("#ffffff");
const fillShapes = ref(false);
const zoom = ref(100);

const mousePos = ref<Point>({ x: 0, y: 0 });
const canvasSize = ref({ width: 1120, height: 640 });
const isDrawing = ref(false);

let ctx: CanvasRenderingContext2D | null = null;
let startPoint: Point = { x: 0, y: 0 };
let lastPoint: Point = { x: 0, y: 0 };
let snapshot: ImageData | null = null;
let activeStrokeColor = "#000000";
const undoStack: ImageData[] = [];
const redoStack: ImageData[] = [];
const maxHistory = 30;

const palette = [
  "#000000", "#7f7f7f", "#880015", "#ed1c24", "#ff7f27", "#fff200", "#22b14c", "#00a2e8",
  "#3f48cc", "#a349a4", "#ffffff", "#c3c3c3", "#b97a57", "#ffaec9", "#ffc90e", "#efe4b0",
  "#b5e61d", "#99d9ea", "#7092be", "#c8bfe7", "#1b1464", "#d9d9d9", "#9e005d", "#f15a24",
  "#f7931e", "#8cc63f", "#00a99d", "#2e3192",
];

const canUndo = computed(() => undoStack.length > 0);
const canRedo = computed(() => redoStack.length > 0);

function getToolLabel(tool: Tool) {
  if (tool === "pencil") return "Pencil";
  if (tool === "brush") return "Brush";
  if (tool === "eraser") return "Eraser";
  if (tool === "fill") return "Fill";
  if (tool === "line") return "Line";
  if (tool === "rect") return "Rectangle";
  return "Ellipse";
}

function initCanvas() {
  const canvas = canvasRef.value;
  if (!canvas) return;
  canvas.width = canvasSize.value.width;
  canvas.height = canvasSize.value.height;
  ctx = canvas.getContext("2d");
  if (!ctx) return;

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function pushState() {
  if (!ctx || !canvasRef.value) return;
  const data = ctx.getImageData(0, 0, canvasRef.value.width, canvasRef.value.height);
  undoStack.push(data);
  if (undoStack.length > maxHistory) undoStack.shift();
}

function beginActionState() {
  pushState();
  redoStack.length = 0;
}

function undo() {
  if (!ctx || !canvasRef.value || !undoStack.length) return;
  const current = ctx.getImageData(0, 0, canvasRef.value.width, canvasRef.value.height);
  const previous = undoStack.pop();
  if (!previous) return;
  redoStack.push(current);
  ctx.putImageData(previous, 0, 0);
}

function redo() {
  if (!ctx || !canvasRef.value || !redoStack.length) return;
  const current = ctx.getImageData(0, 0, canvasRef.value.width, canvasRef.value.height);
  const next = redoStack.pop();
  if (!next) return;
  undoStack.push(current);
  ctx.putImageData(next, 0, 0);
}

function clearCanvas() {
  if (!ctx || !canvasRef.value) return;
  beginActionState();
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvasRef.value.width, canvasRef.value.height);
}

function getPointFromEvent(event: MouseEvent): Point {
  const canvas = canvasRef.value!;
  const rect = canvas.getBoundingClientRect();
  const x = Math.max(0, Math.min(canvas.width - 1, Math.floor((event.clientX - rect.left) * (canvas.width / rect.width))));
  const y = Math.max(0, Math.min(canvas.height - 1, Math.floor((event.clientY - rect.top) * (canvas.height / rect.height))));
  return { x, y };
}

function getActiveColor(event: MouseEvent) {
  return event.button === 2 ? secondaryColor.value : primaryColor.value;
}

function setStrokeStyle(color: string, size: number) {
  if (!ctx) return;
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = size;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
}

function drawSegment(from: Point, to: Point, color: string, size: number) {
  if (!ctx) return;
  setStrokeStyle(color, size);
  ctx.beginPath();
  ctx.moveTo(from.x, from.y);
  ctx.lineTo(to.x, to.y);
  ctx.stroke();
}

function drawDot(point: Point, color: string, size: number) {
  if (!ctx) return;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(point.x, point.y, Math.max(1, size / 2), 0, Math.PI * 2);
  ctx.fill();
}

function drawShapePreview(current: Point, color: string) {
  if (!ctx || !canvasRef.value || !snapshot) return;
  ctx.putImageData(snapshot, 0, 0);
  setStrokeStyle(color, Math.max(1, brushSize.value));

  const x = Math.min(startPoint.x, current.x);
  const y = Math.min(startPoint.y, current.y);
  const w = Math.abs(current.x - startPoint.x);
  const h = Math.abs(current.y - startPoint.y);

  if (activeTool.value === "line") {
    ctx.beginPath();
    ctx.moveTo(startPoint.x, startPoint.y);
    ctx.lineTo(current.x, current.y);
    ctx.stroke();
    return;
  }

  if (activeTool.value === "rect") {
    if (fillShapes.value) ctx.fillRect(x, y, w, h);
    ctx.strokeRect(x, y, w, h);
    return;
  }

  if (activeTool.value === "ellipse") {
    ctx.beginPath();
    ctx.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
    if (fillShapes.value) ctx.fill();
    ctx.stroke();
  }
}

function colorsMatch(data: Uint8ClampedArray, idx: number, target: [number, number, number, number]) {
  return data[idx] === target[0] && data[idx + 1] === target[1] && data[idx + 2] === target[2] && data[idx + 3] === target[3];
}

function parseHexColor(hex: string): [number, number, number, number] {
  const val = hex.replace("#", "");
  const n = Number.parseInt(val, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255, 255];
}

function floodFill(x: number, y: number, color: string) {
  if (!ctx || !canvasRef.value) return;
  const image = ctx.getImageData(0, 0, canvasRef.value.width, canvasRef.value.height);
  const data = image.data;
  const targetIdx = (y * canvasRef.value.width + x) * 4;
  const target: [number, number, number, number] = [data[targetIdx], data[targetIdx + 1], data[targetIdx + 2], data[targetIdx + 3]];
  const replacement = parseHexColor(color);
  if (target[0] === replacement[0] && target[1] === replacement[1] && target[2] === replacement[2] && target[3] === replacement[3]) return;

  const stack: Point[] = [{ x, y }];
  while (stack.length) {
    const p = stack.pop()!;
    const idx = (p.y * canvasRef.value.width + p.x) * 4;
    if (!colorsMatch(data, idx, target)) continue;
    data[idx] = replacement[0];
    data[idx + 1] = replacement[1];
    data[idx + 2] = replacement[2];
    data[idx + 3] = replacement[3];

    if (p.x > 0) stack.push({ x: p.x - 1, y: p.y });
    if (p.x < canvasRef.value.width - 1) stack.push({ x: p.x + 1, y: p.y });
    if (p.y > 0) stack.push({ x: p.x, y: p.y - 1 });
    if (p.y < canvasRef.value.height - 1) stack.push({ x: p.x, y: p.y + 1 });
  }
  ctx.putImageData(image, 0, 0);
}

function onCanvasMouseDown(event: MouseEvent) {
  if (!ctx || !canvasRef.value) return;
  const point = getPointFromEvent(event);
  mousePos.value = point;
  const color = getActiveColor(event);
  activeStrokeColor = color;

  if (activeTool.value === "fill") {
    beginActionState();
    floodFill(point.x, point.y, color);
    return;
  }

  beginActionState();
  isDrawing.value = true;
  startPoint = point;
  lastPoint = point;
  snapshot = ctx.getImageData(0, 0, canvasRef.value.width, canvasRef.value.height);

  if (activeTool.value === "pencil") drawDot(point, color, 1);
  if (activeTool.value === "brush") drawDot(point, color, brushSize.value);
  if (activeTool.value === "eraser") drawDot(point, "#ffffff", Math.max(4, brushSize.value * 1.8));
}

function onCanvasMouseMove(event: MouseEvent) {
  const point = getPointFromEvent(event);
  mousePos.value = point;
  if (!isDrawing.value || !ctx) return;

  if (activeTool.value === "pencil") {
    drawSegment(lastPoint, point, activeStrokeColor, 1);
    lastPoint = point;
    return;
  }

  if (activeTool.value === "brush") {
    drawSegment(lastPoint, point, activeStrokeColor, brushSize.value);
    lastPoint = point;
    return;
  }

  if (activeTool.value === "eraser") {
    drawSegment(lastPoint, point, "#ffffff", Math.max(4, brushSize.value * 1.8));
    lastPoint = point;
    return;
  }

  drawShapePreview(point, activeStrokeColor);
}

function onCanvasMouseUp(event: MouseEvent) {
  if (!isDrawing.value || !ctx) return;
  if (activeTool.value === "line" || activeTool.value === "rect" || activeTool.value === "ellipse") {
    drawShapePreview(getPointFromEvent(event), activeStrokeColor);
  }
  isDrawing.value = false;
  snapshot = null;
}

function swapColors() {
  const temp = primaryColor.value;
  primaryColor.value = secondaryColor.value;
  secondaryColor.value = temp;
}

function setColor(color: string, secondary = false) {
  if (secondary) secondaryColor.value = color;
  else primaryColor.value = color;
}

function openImagePicker() {
  fileInputRef.value?.click();
}

function onImageSelected(event: Event) {
  const input = event.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file || !ctx || !canvasRef.value) return;

  const reader = new FileReader();
  reader.onload = () => {
    const img = new Image();
    img.onload = () => {
      beginActionState();
      ctx!.fillStyle = "#ffffff";
      ctx!.fillRect(0, 0, canvasRef.value!.width, canvasRef.value!.height);
      const scale = Math.min(canvasRef.value!.width / img.width, canvasRef.value!.height / img.height);
      const w = img.width * scale;
      const h = img.height * scale;
      const x = (canvasRef.value!.width - w) / 2;
      const y = (canvasRef.value!.height - h) / 2;
      ctx!.drawImage(img, x, y, w, h);
    };
    img.src = String(reader.result);
  };
  reader.readAsDataURL(file);
  input.value = "";
}

function saveAsPng() {
  if (!canvasRef.value) return;
  const link = document.createElement("a");
  link.download = "mspaint-drawing.png";
  link.href = canvasRef.value.toDataURL("image/png");
  link.click();
}

onMounted(() => {
  initCanvas();
});
</script>

<template>
  <div class="paint-shell">
    <div class="tabs-row">
      <button class="file-tab">File</button>
      <button class="active">Home</button>
      <button>View</button>
    </div>

    <section class="ribbon">
      <div class="group">
        <div class="group-tools">
          <button @click="openImagePicker"><i class="bi bi-folder2-open"></i><span>Open</span></button>
          <button @click="saveAsPng"><i class="bi bi-download"></i><span>Save</span></button>
          <button @click="clearCanvas"><i class="bi bi-file-earmark-plus"></i><span>New</span></button>
        </div>
        <small>File</small>
      </div>

      <div class="group">
        <div class="group-tools">
          <button :disabled="!canUndo" @click="undo"><i class="bi bi-arrow-counterclockwise"></i><span>Undo</span></button>
          <button :disabled="!canRedo" @click="redo"><i class="bi bi-arrow-clockwise"></i><span>Redo</span></button>
        </div>
        <small>History</small>
      </div>

      <div class="group">
        <div class="tool-grid">
          <button v-for="tool in ['pencil','brush','eraser','fill','line','rect','ellipse']" :key="tool" :class="{ active: activeTool === tool }" @click="activeTool = tool as Tool">
            <i class="bi" :class="tool === 'pencil' ? 'bi-pencil' : tool === 'brush' ? 'bi-brush' : tool === 'eraser' ? 'bi-eraser' : tool === 'fill' ? 'bi-paint-bucket' : tool === 'line' ? 'bi-slash-lg' : tool === 'rect' ? 'bi-square' : 'bi-circle'"></i>
            <span>{{ getToolLabel(tool as Tool) }}</span>
          </button>
        </div>
        <small>Tools</small>
      </div>

      <div class="group">
        <div class="group-tools vertical">
          <label>Size: {{ brushSize }}px</label>
          <input v-model.number="brushSize" type="range" min="1" max="42" />
          <label><input v-model="fillShapes" type="checkbox" /> Fill Shapes</label>
        </div>
        <small>Size & Fill</small>
      </div>

      <div class="group colors-group">
        <div class="big-colors">
          <button class="color-chip primary" :style="{ background: primaryColor }"></button>
          <button class="color-chip secondary" :style="{ background: secondaryColor }"></button>
          <button class="swap-btn" @click="swapColors"><i class="bi bi-arrow-left-right"></i></button>
        </div>
        <div class="palette">
          <button
            v-for="color in palette"
            :key="color"
            class="palette-item"
            :style="{ background: color }"
            @click.left="setColor(color)"
            @click.right.prevent="setColor(color, true)"
          ></button>
        </div>
        <small>Colors</small>
      </div>
    </section>

    <main class="workspace">
      <div class="canvas-wrap" :style="{ '--zoom': String(zoom) }">
        <canvas
          ref="canvasRef"
          class="paint-canvas"
          @mousedown.left="onCanvasMouseDown"
          @mousedown.right.prevent="onCanvasMouseDown"
          @mousemove="onCanvasMouseMove"
          @mouseup="onCanvasMouseUp"
          @mouseleave="onCanvasMouseUp"
          @contextmenu.prevent
        ></canvas>
      </div>
    </main>

    <footer class="statusbar">
      <div class="left-status">
        <span>{{ canvasSize.width }} x {{ canvasSize.height }} px</span>
        <span>Tool: {{ getToolLabel(activeTool) }}</span>
        <span>X: {{ mousePos.x }}, Y: {{ mousePos.y }}</span>
      </div>
      <div class="zoom-status">
        <i class="bi bi-zoom-out"></i>
        <input v-model.number="zoom" type="range" min="25" max="300" />
        <i class="bi bi-zoom-in"></i>
        <span>{{ zoom }}%</span>
      </div>
    </footer>

    <input ref="fileInputRef" type="file" accept="image/*" class="hidden-input" @change="onImageSelected" />
  </div>
</template>

<style scoped>
.paint-shell {
  height: 100%;
  width: 100%;
  display: flex;
  grid-template-rows: 34px 34px 148px 1fr 30px;
  background: #f2f2f2;
  color: #111;
  overflow: hidden;
  user-select: none;
  flex-direction: column;
}

.titlebar {
  background: linear-gradient(180deg, #fcfcfc 0%, #ededed 100%);
  border-bottom: 1px solid #d0d0d0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 10px;
}

.left-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
}

.left-title i {
  color: #0b64d3;
}

.win-actions button {
  border: 0;
  width: 38px;
  height: 28px;
  background: transparent;
  cursor: pointer;
}

.win-actions .danger:hover {
  background: #e81123;
  color: #fff;
}

.tabs-row {
  background: #ffffff;
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 3px 6px;
  border-bottom: 1px solid #d7d7d7;
}

.tabs-row button {
  border: 1px solid transparent;
  border-radius: 3px;
  height: 26px;
  padding: 0 12px;
  background: transparent;
  cursor: pointer;
}

.tabs-row .file-tab {
  background: #0d66d0;
  color: #fff;
}

.tabs-row .active {
  background: #ffffff;
  border-color: #d0d0d0;
  font-weight: 600;
}

.ribbon {
  background: #f8f8f8;
  border-bottom: 1px solid #d0d0d0;
  display: flex;
  gap: 8px;
  padding: 8px;
  overflow-x: auto;
}

.group {
  min-width: max-content;
  border-right: 1px solid #d6d6d6;
  padding-right: 8px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.group:last-child {
  border-right: 0;
}

.group small {
  text-align: center;
  color: #4b4b4b;
  font-size: 11px;
}

.group-tools {
  display: flex;
  align-items: center;
  gap: 6px;
}

.group-tools.vertical {
  flex-direction: column;
  align-items: flex-start;
  min-width: 150px;
}

.group-tools button {
  height: 58px;
  width: 64px;
  border: 1px solid #c8c8c8;
  background: #fff;
  border-radius: 4px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  cursor: pointer;
}

.group-tools button i {
  font-size: 18px;
}

.group-tools button span {
  font-size: 11px;
}

.group-tools button:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.tool-grid {
  display: grid;
  grid-template-columns: repeat(4, 58px);
  gap: 6px;
}

.tool-grid button {
  border: 1px solid #c8c8c8;
  background: #fff;
  border-radius: 4px;
  height: 56px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  cursor: pointer;
  font-size: 11px;
}

.tool-grid button.active {
  border-color: #0d66d0;
  box-shadow: inset 0 0 0 1px #0d66d0;
}

.tool-grid button i {
  font-size: 17px;
}

.colors-group {
  min-width: 360px;
}

.big-colors {
  display: flex;
  align-items: center;
  gap: 8px;
}

.color-chip {
  width: 44px;
  height: 44px;
  border: 1px solid #7a7a7a;
  border-radius: 3px;
}

.color-chip.primary {
  box-shadow: 0 0 0 2px #fff, 0 0 0 3px #999;
}

.color-chip.secondary {
  box-shadow: inset 0 0 0 2px #fff;
}

.swap-btn {
  border: 1px solid #c8c8c8;
  width: 32px;
  height: 32px;
  border-radius: 4px;
  background: #fff;
  cursor: pointer;
}

.palette {
  display: grid;
  grid-template-columns: repeat(14, 20px);
  gap: 4px;
}

.palette-item {
  border: 1px solid #7d7d7d;
  width: 20px;
  height: 20px;
  cursor: pointer;
}

.workspace {
  overflow: auto;
  padding: 14px;
  background:
    linear-gradient(45deg, #ececec 25%, transparent 25%) -8px 0/16px 16px,
    linear-gradient(-45deg, #ececec 25%, transparent 25%) -8px 0/16px 16px,
    linear-gradient(45deg, transparent 75%, #ececec 75%) -8px 0/16px 16px,
    linear-gradient(-45deg, transparent 75%, #ececec 75%) -8px 0/16px 16px,
    #f6f6f6;
}

.canvas-wrap {
  width: max-content;
  margin: 0 auto;
  transform: scale(calc(var(--zoom) / 100));
  transform-origin: top center;
}

.paint-canvas {
  display: block;
  background: #fff;
  border: 1px solid #a7a7a7;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.12);
  cursor: crosshair;
}

.statusbar {
  border-top: 1px solid #d0d0d0;
  background: #f7f7f7;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 10px;
  font-size: 12px;
}

.left-status {
  display: flex;
  align-items: center;
  gap: 14px;
}

.zoom-status {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 210px;
}

.hidden-input {
  display: none;
}

@media (max-width: 1024px) {
  .paint-shell {
    grid-template-rows: 34px 34px 160px 1fr 36px;
  }

  .statusbar {
    flex-direction: column;
    align-items: flex-start;
    justify-content: center;
    gap: 4px;
    padding: 4px 8px;
  }
}
</style>
