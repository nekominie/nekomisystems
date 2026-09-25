<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import type { WindowInstance } from '../../../../data/app'

const props = defineProps<{
    win?: WindowInstance
}>()

interface HistoryItem {
    id: string
    expr: string
    result: string
}

// Estado de la calculadora
const displayValue = ref<string>('0')
const expression = ref<string>('')
const prevValue = ref<number | null>(null)
const activeOperator = ref<'+' | '-' | '×' | '÷' | null>(null)
const waitingForOperand = ref<boolean>(false)
const hasError = ref<boolean>(false)

// Historial
const showHistory = ref<boolean>(false)
const history = ref<HistoryItem[]>([])

// Formateador de números para visualización
const cleanPrecision = (num: number): number => {
    return parseFloat(num.toPrecision(12))
}

const formatNumberDisplay = (strVal: string): string => {
    if (hasError.value || isNaN(Number(strVal)) && !strVal.endsWith('.')) {
        return strVal
    }
    const isNegative = strVal.startsWith('-')
    const raw = isNegative ? strVal.slice(1) : strVal
    const parts = raw.split('.')
    const intPart = parts[0]
    const decPart = parts[1]

    const formattedInt = intPart ? Number(intPart).toLocaleString('es-ES') : '0'

    let res = (isNegative ? '-' : '') + formattedInt
    if (parts.length > 1) {
        res += ',' + decPart
    } else if (strVal.endsWith('.')) {
        res += ','
    }
    return res
}

const formattedDisplay = computed(() => {
    return formatNumberDisplay(displayValue.value)
})

// Tamaño de fuente dinámico según la longitud del texto
const displayFontSize = computed(() => {
    const len = formattedDisplay.value.length
    if (len > 15) return '22px'
    if (len > 12) return '28px'
    if (len > 9) return '34px'
    return '42px'
})

// Acciones numéricas
const inputDigit = (digit: string) => {
    if (hasError.value) {
        handleClear()
    }

    if (waitingForOperand.value) {
        displayValue.value = digit
        waitingForOperand.value = false
    } else {
        if (displayValue.value === '0') {
            displayValue.value = digit
        } else if (displayValue.value.replace(/[^0-9]/g, '').length < 16) {
            displayValue.value += digit
        }
    }
}

const inputDecimal = () => {
    if (hasError.value) {
        handleClear()
    }

    if (waitingForOperand.value) {
        displayValue.value = '0.'
        waitingForOperand.value = false
    } else if (!displayValue.value.includes('.')) {
        displayValue.value += '.'
    }
}

// Operadores básicos
const executeCalculation = (a: number, b: number, op: '+' | '-' | '×' | '÷'): { result?: number; error?: string } => {
    switch (op) {
        case '+':
            return { result: cleanPrecision(a + b) }
        case '-':
            return { result: cleanPrecision(a - b) }
        case '×':
            return { result: cleanPrecision(a * b) }
        case '÷':
            if (b === 0) return { error: 'No se puede dividir entre cero' }
            return { result: cleanPrecision(a / b) }
    }
}

const handleOperator = (op: '+' | '-' | '×' | '÷') => {
    if (hasError.value) return

    const current = parseFloat(displayValue.value)

    if (prevValue.value === null) {
        prevValue.value = current
        activeOperator.value = op
        expression.value = `${formatNumberDisplay(String(current))} ${op}`
        waitingForOperand.value = true
    } else if (waitingForOperand.value) {
        // El usuario solo cambió de operador
        activeOperator.value = op
        expression.value = `${formatNumberDisplay(String(prevValue.value))} ${op}`
    } else {
        // Hay cálculo intermedio encadenado (ej: 5 + 3 * ...)
        if (activeOperator.value) {
            const calc = executeCalculation(prevValue.value, current, activeOperator.value)
            if (calc.error) {
                displayValue.value = calc.error
                hasError.value = true
                expression.value = ''
                prevValue.value = null
                activeOperator.value = null
                waitingForOperand.value = true
                return
            }
            prevValue.value = calc.result!
            displayValue.value = String(calc.result!)
            expression.value = `${formatNumberDisplay(String(calc.result!))} ${op}`
            activeOperator.value = op
            waitingForOperand.value = true
        }
    }
}

const handleEquals = () => {
    if (hasError.value || !activeOperator.value || prevValue.value === null) return

    const current = parseFloat(displayValue.value)
    const calc = executeCalculation(prevValue.value, current, activeOperator.value)

    const fullExpr = `${formatNumberDisplay(String(prevValue.value))} ${activeOperator.value} ${formatNumberDisplay(String(current))} =`

    if (calc.error) {
        displayValue.value = calc.error
        hasError.value = true
        expression.value = fullExpr
        prevValue.value = null
        activeOperator.value = null
        waitingForOperand.value = true
    } else {
        const finalResult = calc.result!
        expression.value = fullExpr
        displayValue.value = String(finalResult)
        
        // Guardar en historial
        history.value.unshift({
            id: String(Date.now() + Math.random()),
            expr: fullExpr,
            result: formatNumberDisplay(String(finalResult))
        })
        if (history.value.length > 30) history.value.pop()

        prevValue.value = null
        activeOperator.value = null
        waitingForOperand.value = true
    }
}

// Funciones especiales
const handleClearEntry = () => {
    if (hasError.value) {
        handleClear()
    } else {
        displayValue.value = '0'
    }
}

const handleClear = () => {
    displayValue.value = '0'
    expression.value = ''
    prevValue.value = null
    activeOperator.value = null
    waitingForOperand.value = false
    hasError.value = false
}

const handleBackspace = () => {
    if (hasError.value) {
        handleClear()
        return
    }
    if (waitingForOperand.value) return

    if (displayValue.value.length > 1) {
        displayValue.value = displayValue.value.slice(0, -1)
        if (displayValue.value === '-' || displayValue.value === '-0') {
            displayValue.value = '0'
        }
    } else {
        displayValue.value = '0'
    }
}

const handleToggleSign = () => {
    if (hasError.value || displayValue.value === '0') return

    if (displayValue.value.startsWith('-')) {
        displayValue.value = displayValue.value.slice(1)
    } else {
        displayValue.value = '-' + displayValue.value
    }
}

const handlePercent = () => {
    if (hasError.value) return
    const current = parseFloat(displayValue.value)
    
    if (prevValue.value !== null && activeOperator.value) {
        // En sumas/restas porcentaje del anterior, en mult/div porcentaje directo
        const pctValue = cleanPrecision(prevValue.value * (current / 100))
        displayValue.value = String(pctValue)
    } else {
        const pctValue = cleanPrecision(current / 100)
        displayValue.value = String(pctValue)
        expression.value = `${formatNumberDisplay(String(current))}% =`
    }
}

const handleReciprocal = () => {
    if (hasError.value) return
    const current = parseFloat(displayValue.value)
    if (current === 0) {
        displayValue.value = 'No se puede dividir entre cero'
        hasError.value = true
        expression.value = '1/(0)'
        prevValue.value = null
        activeOperator.value = null
        waitingForOperand.value = true
        return
    }
    const res = cleanPrecision(1 / current)
    expression.value = `1/(${formatNumberDisplay(String(current))})`
    displayValue.value = String(res)
    waitingForOperand.value = true
}

const handleSquare = () => {
    if (hasError.value) return
    const current = parseFloat(displayValue.value)
    const res = cleanPrecision(current * current)
    expression.value = `sqr(${formatNumberDisplay(String(current))})`
    displayValue.value = String(res)
    waitingForOperand.value = true
}

const handleSqrt = () => {
    if (hasError.value) return
    const current = parseFloat(displayValue.value)
    if (current < 0) {
        displayValue.value = 'Entrada no válida'
        hasError.value = true
        expression.value = `√(${formatNumberDisplay(String(current))})`
        prevValue.value = null
        activeOperator.value = null
        waitingForOperand.value = true
        return
    }
    const res = cleanPrecision(Math.sqrt(current))
    expression.value = `√(${formatNumberDisplay(String(current))})`
    displayValue.value = String(res)
    waitingForOperand.value = true
}

// Cargar item de historial
const loadHistoryItem = (item: HistoryItem) => {
    const rawNum = item.result.replace(/\./g, '').replace(',', '.')
    displayValue.value = rawNum
    expression.value = item.expr
    waitingForOperand.value = true
    hasError.value = false
    showHistory.value = false
}

const clearHistory = () => {
    history.value = []
}

// Teclado
const handleKeyDown = (e: KeyboardEvent) => {
    if (props.win && !props.win.isFocused) return
    if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return

    if (e.key >= '0' && e.key <= '9') {
        e.preventDefault()
        inputDigit(e.key)
    } else if (e.key === '.' || e.key === ',') {
        e.preventDefault()
        inputDecimal()
    } else if (e.key === '+') {
        e.preventDefault()
        handleOperator('+')
    } else if (e.key === '-') {
        e.preventDefault()
        handleOperator('-')
    } else if (e.key === '*' || e.key.toLowerCase() === 'x') {
        e.preventDefault()
        handleOperator('×')
    } else if (e.key === '/') {
        e.preventDefault()
        handleOperator('÷')
    } else if (e.key === 'Enter' || e.key === '=') {
        e.preventDefault()
        handleEquals()
    } else if (e.key === 'Backspace') {
        e.preventDefault()
        handleBackspace()
    } else if (e.key === 'Escape') {
        e.preventDefault()
        handleClear()
    } else if (e.key === '%') {
        e.preventDefault()
        handlePercent()
    } else if (e.key === 'Delete') {
        e.preventDefault()
        handleClearEntry()
    }
}

onMounted(() => {
    window.addEventListener('keydown', handleKeyDown)
})

onBeforeUnmount(() => {
    window.removeEventListener('keydown', handleKeyDown)
})
</script>

<template>
    <div class="calculator-app">
        <!-- Barra de herramientas superior -->
        <header class="calc-header">
            <div class="mode-label">
                <i class="bi bi-calculator"></i>
                <span>Estándar</span>
            </div>
            <button 
                class="history-toggle-btn" 
                :class="{ active: showHistory }"
                title="Historial de cálculos"
                @click="showHistory = !showHistory"
            >
                <i class="bi bi-clock-history"></i>
            </button>
        </header>

        <!-- Pantalla de visualización -->
        <section class="calc-display-section">
            <div class="calc-expression" :title="expression">
                {{ expression || '&nbsp;' }}
            </div>
            <div 
                class="calc-result" 
                :style="{ fontSize: displayFontSize }"
                :title="formattedDisplay"
            >
                {{ formattedDisplay }}
            </div>
        </section>

        <!-- Panel de Historial deslizante -->
        <transition name="slide-down">
            <div v-if="showHistory" class="history-panel">
                <div class="history-header">
                    <span>Historial</span>
                    <button class="clear-history-btn" @click="clearHistory" title="Borrar historial" :disabled="history.length === 0">
                        <i class="bi bi-trash3"></i>
                    </button>
                </div>
                <div class="history-content">
                    <div v-if="history.length === 0" class="history-empty">
                        <i class="bi bi-clock"></i>
                        <span>Aún no hay historial</span>
                    </div>
                    <div 
                        v-else 
                        v-for="item in history" 
                        :key="item.id" 
                        class="history-item"
                        @click="loadHistoryItem(item)"
                    >
                        <div class="history-expr">{{ item.expr }}</div>
                        <div class="history-res">{{ item.result }}</div>
                    </div>
                </div>
            </div>
        </transition>

        <!-- Teclado de botones -->
        <main class="calc-keypad">
            <!-- Fila 1 -->
            <button class="calc-btn fn-btn" @click="handlePercent" title="Porcentaje (%)">
                %
            </button>
            <button class="calc-btn fn-btn" @click="handleClearEntry" title="Borrar entrada (CE)">
                CE
            </button>
            <button class="calc-btn fn-btn" @click="handleClear" title="Borrar todo (C)">
                C
            </button>
            <button class="calc-btn fn-btn" @click="handleBackspace" title="Retroceso (⌫)">
                <i class="bi bi-backspace"></i>
            </button>

            <!-- Fila 2 -->
            <button class="calc-btn fn-btn" @click="handleReciprocal" title="Inverso (1/x)">
                <sup>1</sup>/<sub>x</sub>
            </button>
            <button class="calc-btn fn-btn" @click="handleSquare" title="Elevar al cuadrado (x²)">
                x<sup>2</sup>
            </button>
            <button class="calc-btn fn-btn" @click="handleSqrt" title="Raíz cuadrada (²√x)">
                <sup>2</sup>&radic;x
            </button>
            <button 
                class="calc-btn op-btn" 
                :class="{ active: activeOperator === '÷' && waitingForOperand }"
                @click="handleOperator('÷')" 
                title="Dividir"
            >
                ÷
            </button>

            <!-- Fila 3 -->
            <button class="calc-btn num-btn" @click="inputDigit('7')">7</button>
            <button class="calc-btn num-btn" @click="inputDigit('8')">8</button>
            <button class="calc-btn num-btn" @click="inputDigit('9')">9</button>
            <button 
                class="calc-btn op-btn" 
                :class="{ active: activeOperator === '×' && waitingForOperand }"
                @click="handleOperator('×')" 
                title="Multiplicar"
            >
                ×
            </button>

            <!-- Fila 4 -->
            <button class="calc-btn num-btn" @click="inputDigit('4')">4</button>
            <button class="calc-btn num-btn" @click="inputDigit('5')">5</button>
            <button class="calc-btn num-btn" @click="inputDigit('6')">6</button>
            <button 
                class="calc-btn op-btn" 
                :class="{ active: activeOperator === '-' && waitingForOperand }"
                @click="handleOperator('-')" 
                title="Restar"
            >
                −
            </button>

            <!-- Fila 5 -->
            <button class="calc-btn num-btn" @click="inputDigit('1')">1</button>
            <button class="calc-btn num-btn" @click="inputDigit('2')">2</button>
            <button class="calc-btn num-btn" @click="inputDigit('3')">3</button>
            <button 
                class="calc-btn op-btn" 
                :class="{ active: activeOperator === '+' && waitingForOperand }"
                @click="handleOperator('+')" 
                title="Sumar"
            >
                +
            </button>

            <!-- Fila 6 -->
            <button class="calc-btn fn-btn" @click="handleToggleSign" title="Cambiar signo (±)">
                <i class="bi bi-plus-slash-minus"></i>
            </button>
            <button class="calc-btn num-btn" @click="inputDigit('0')">0</button>
            <button class="calc-btn num-btn" @click="inputDecimal" title="Coma decimal">
                ,
            </button>
            <button class="calc-btn eq-btn" @click="handleEquals" title="Calcular resultado (=)">
                =
            </button>
        </main>
    </div>
</template>

<style scoped>
.calculator-app {
    height: 100%;
    width: 100%;
    display: flex;
    flex-direction: column;
    box-sizing: border-box;
    position: relative;
    user-select: none;
    -webkit-user-select: none;
    background: rgba(18, 22, 30, 0.45);
    backdrop-filter: blur(24px);
    -webkit-backdrop-filter: blur(24px);
    color: #ffffff;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    overflow: hidden;
}

/* Header */
.calc-header {
    height: 38px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 14px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.06);
    flex-shrink: 0;
}

.mode-label {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 13px;
    font-weight: 600;
    color: rgba(255, 255, 255, 0.85);
    letter-spacing: 0.2px;
}

.mode-label i {
    font-size: 14px;
    color: #48cae4;
}

.history-toggle-btn {
    width: 28px;
    height: 28px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: transparent;
    border: none;
    border-radius: 6px;
    color: rgba(255, 255, 255, 0.7);
    cursor: pointer;
    transition: background 0.15s ease, color 0.15s ease;
}

.history-toggle-btn:hover {
    background: rgba(255, 255, 255, 0.1);
    color: #ffffff;
}

.history-toggle-btn.active {
    background: rgba(72, 202, 228, 0.2);
    color: #48cae4;
}

/* Pantalla */
.calc-display-section {
    padding: 8px 16px 12px 16px;
    display: flex;
    flex-direction: column;
    justify-content: flex-end;
    align-items: flex-end;
    min-height: 80px;
    box-sizing: border-box;
    flex-shrink: 0;
}

.calc-expression {
    font-size: 13px;
    color: rgba(255, 255, 255, 0.55);
    min-height: 18px;
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    letter-spacing: 0.3px;
    font-weight: 400;
}

.calc-result {
    font-weight: 700;
    letter-spacing: -0.5px;
    line-height: 1.15;
    color: #ffffff;
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    transition: font-size 0.12s ease;
    text-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
}

/* Historial deslizante */
.history-panel {
    position: absolute;
    top: 38px;
    bottom: 0;
    left: 0;
    right: 0;
    background: rgba(16, 20, 28, 0.94);
    backdrop-filter: blur(30px);
    -webkit-backdrop-filter: blur(30px);
    z-index: 20;
    display: flex;
    flex-direction: column;
    border-top: 1px solid rgba(255, 255, 255, 0.08);
}

.history-header {
    height: 38px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 14px;
    font-size: 13px;
    font-weight: 600;
    color: rgba(255, 255, 255, 0.85);
    border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.clear-history-btn {
    background: transparent;
    border: none;
    color: rgba(255, 255, 255, 0.6);
    border-radius: 4px;
    padding: 4px 8px;
    cursor: pointer;
    transition: all 0.15s ease;
}

.clear-history-btn:not(:disabled):hover {
    color: #ff6b6b;
    background: rgba(255, 107, 107, 0.15);
}

.clear-history-btn:disabled {
    opacity: 0.3;
    cursor: default;
}

.history-content {
    flex: 1;
    overflow-y: auto;
    padding: 10px;
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.history-empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    color: rgba(255, 255, 255, 0.4);
    gap: 8px;
    font-size: 13px;
}

.history-empty i {
    font-size: 26px;
    opacity: 0.6;
}

.history-item {
    padding: 8px 12px;
    border-radius: 8px;
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid rgba(255, 255, 255, 0.06);
    cursor: pointer;
    text-align: right;
    transition: all 0.15s ease;
}

.history-item:hover {
    background: rgba(255, 255, 255, 0.08);
    border-color: rgba(72, 202, 228, 0.4);
    transform: translateY(-1px);
}

.history-expr {
    font-size: 12px;
    color: rgba(255, 255, 255, 0.55);
    margin-bottom: 2px;
}

.history-res {
    font-size: 18px;
    font-weight: 700;
    color: #ffffff;
}

/* Transición panel historial */
.slide-down-enter-active,
.slide-down-leave-active {
    transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.2s ease;
}

.slide-down-enter-from,
.slide-down-leave-to {
    transform: translateY(-10px);
    opacity: 0;
}

/* Teclado */
.calc-keypad {
    flex: 1;
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    grid-template-rows: repeat(6, 1fr);
    gap: 4px;
    padding: 4px 10px 10px 10px;
    box-sizing: border-box;
}

/* Botones */
.calc-btn {
    border-radius: 6px;
    border: 1px solid rgba(255, 255, 255, 0.06);
    outline: none;
    font-family: inherit;
    font-size: 15px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #ffffff;
    transition: background 0.12s ease, border-color 0.12s ease, transform 0.06s ease, box-shadow 0.12s ease;
    user-select: none;
}

.calc-btn:active {
    transform: scale(0.96);
}

/* Botones Numéricos */
.num-btn {
    background: rgba(255, 255, 255, 0.07);
    font-weight: 600;
    font-size: 16px;
}

.num-btn:hover {
    background: rgba(255, 255, 255, 0.13);
    border-color: rgba(255, 255, 255, 0.15);
}

.num-btn:active {
    background: rgba(255, 255, 255, 0.18);
}

/* Botones de Función */
.fn-btn {
    background: rgba(255, 255, 255, 0.035);
    color: rgba(255, 255, 255, 0.85);
    font-size: 13px;
    font-weight: 500;
}

.fn-btn:hover {
    background: rgba(255, 255, 255, 0.08);
    color: #ffffff;
}

.fn-btn:active {
    background: rgba(255, 255, 255, 0.12);
}

/* Botones de Operación */
.op-btn {
    background: rgba(255, 255, 255, 0.045);
    font-size: 18px;
    color: rgba(255, 255, 255, 0.9);
}

.op-btn:hover {
    background: rgba(255, 255, 255, 0.1);
    color: #ffffff;
    border-color: rgba(255, 255, 255, 0.15);
}

.op-btn.active {
    background: rgba(72, 202, 228, 0.2);
    border-color: #48cae4;
    color: #48cae4;
    box-shadow: 0 0 10px rgba(72, 202, 228, 0.25);
}

/* Botón de Igual */
.eq-btn {
    background: linear-gradient(135deg, rgba(72, 202, 228, 0.85), rgba(0, 150, 199, 0.9));
    border: 1px solid rgba(144, 224, 239, 0.6);
    font-weight: 700;
    font-size: 20px;
    box-shadow: 0 3px 12px rgba(72, 202, 228, 0.25);
    color: #ffffff;
}

.eq-btn:hover {
    background: linear-gradient(135deg, rgba(72, 202, 228, 1), rgba(0, 180, 216, 1));
    border-color: rgba(202, 240, 248, 0.9);
    box-shadow: 0 4px 16px rgba(72, 202, 228, 0.45);
}

.eq-btn:active {
    transform: scale(0.95);
    box-shadow: 0 2px 8px rgba(72, 202, 228, 0.3);
}
</style>
