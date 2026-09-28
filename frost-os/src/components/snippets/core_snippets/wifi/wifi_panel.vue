<script setup lang="ts">
import { ref, computed, inject } from 'vue'
import { useWifiStore, type WifiNetwork } from './wifi_store'
import { useSettingsStore } from '../../../apps/coreapps/settings/store'
import { OS_KEY } from '../../../api/os_api'

const emit = defineEmits<{
  (e: 'request-close'): void
}>()

const os = inject(OS_KEY)
const wifiStore = useWifiStore()
const settingsStore = useSettingsStore()

const expandedSsid = ref<string | null>(null)
const isRefreshing = ref(false)
const autoConnectMap = ref<Record<string, boolean>>({})

const connectedNetwork = computed(() => {
  if (!wifiStore.connectedSsid) return null
  return wifiStore.networks.find((n) => n.ssid === wifiStore.connectedSsid) || {
    ssid: wifiStore.connectedSsid,
    signal: 5,
    security: 'WPA3-Personal',
    isSecured: true,
    frequency: '5 GHz',
  }
})

const otherNetworks = computed(() => {
  return wifiStore.networks.filter((n) => n.ssid !== wifiStore.connectedSsid)
})

function toggleExpand(ssid: string) {
  if (expandedSsid.value === ssid) {
    expandedSsid.value = null
  } else {
    expandedSsid.value = ssid
    if (autoConnectMap.value[ssid] === undefined) {
      autoConnectMap.value[ssid] = true
    }
  }
}

async function handleConnect(ssid: string) {
  await wifiStore.connect(ssid)
  expandedSsid.value = null
}

function handleDisconnect() {
  wifiStore.disconnect()
}

function refreshNetworks() {
  isRefreshing.value = true
  setTimeout(() => {
    isRefreshing.value = false
  }, 600)
}

function openNetworkSettings() {
  settingsStore.setTargetSection('network')
  if (os) {
    os.launchApp('settings')
  }
  emit('request-close')
}

function getSignalIcon(signal: number): string {
  if (signal >= 4) return 'bi-wifi'
  if (signal >= 3) return 'bi-wifi-2'
  if (signal >= 2) return 'bi-wifi-1'
  return 'bi-wifi-off'
}
</script>

<template>
  <div class="wifi-panel">
    <!-- Header -->
    <div class="panel-header">
      <div class="header-title">
        <i
          class="bi"
          :class="wifiStore.wifiEnabled ? 'bi-wifi' : 'bi-ethernet'"
        ></i>
        <span>Red e Internet</span>
      </div>

      <div class="switch-container">
        <span class="switch-label">{{ wifiStore.wifiEnabled ? 'Activado' : 'Desactivado' }}</span>
        <button
          type="button"
          class="toggle-switch"
          :class="{ active: wifiStore.wifiEnabled }"
          :title="wifiStore.wifiEnabled ? 'Desactivar Wi-Fi' : 'Activar Wi-Fi'"
          @click="wifiStore.toggleWifi"
        >
          <span class="toggle-knob"></span>
        </button>
      </div>
    </div>

    <!-- Contenido si Wi-Fi está ACTIVADO -->
    <div v-if="wifiStore.wifiEnabled" class="panel-content">
      <!-- Red actualmente conectada -->
      <div v-if="connectedNetwork" class="connected-card">
        <div class="card-icon">
          <i class="bi bi-wifi"></i>
        </div>
        <div class="card-info">
          <div class="network-name">
            <strong>{{ connectedNetwork.ssid }}</strong>
          </div>
          <div class="network-status">
            <span class="status-pill ok">
              <i class="bi bi-check-circle-fill"></i> Conectada, segura
            </span>
          </div>
          <div class="network-details">
            {{ connectedNetwork.frequency }} • {{ connectedNetwork.security }} • Internet disponible
          </div>
        </div>
        <div class="card-action">
          <button
            class="action-btn disconnect-btn"
            type="button"
            @click="handleDisconnect"
          >
            Desconectar
          </button>
        </div>
      </div>

      <!-- Separador / Título de redes disponibles -->
      <div class="section-header">
        <span class="section-title">Redes disponibles</span>
        <button
          type="button"
          class="refresh-btn"
          title="Buscar redes"
          @click="refreshNetworks"
        >
          <i class="bi bi-arrow-repeat" :class="{ spinning: isRefreshing }"></i>
        </button>
      </div>

      <!-- Lista de redes disponibles -->
      <div class="networks-list">
        <div
          v-for="net in otherNetworks"
          :key="net.ssid"
          class="network-item-wrap"
          :class="{ 'is-expanded': expandedSsid === net.ssid }"
        >
          <div class="network-item" @click="toggleExpand(net.ssid)">
            <div class="net-left">
              <i class="bi net-signal" :class="getSignalIcon(net.signal)"></i>
              <span class="net-ssid">{{ net.ssid }}</span>
            </div>
            <div class="net-right">
              <i
                v-if="net.isSecured"
                class="bi bi-lock-fill net-lock"
                title="Red protegida"
              ></i>
              <span v-else class="open-badge">Abierta</span>
              <i
                class="bi bi-chevron-down expand-chevron"
                :class="{ rotated: expandedSsid === net.ssid }"
              ></i>
            </div>
          </div>

          <!-- Área desplegable para conectar -->
          <div v-if="expandedSsid === net.ssid" class="network-expand-area">
            <div class="auto-connect-row">
              <label class="checkbox-label">
                <input
                  v-model="autoConnectMap[net.ssid]"
                  type="checkbox"
                />
                <span>Conectar automáticamente</span>
              </label>
            </div>
            <div class="connect-action-row">
              <button
                class="action-btn connect-btn"
                type="button"
                :disabled="wifiStore.isConnectingTo === net.ssid"
                @click.stop="handleConnect(net.ssid)"
              >
                <span v-if="wifiStore.isConnectingTo === net.ssid">
                  <span class="mini-spinner"></span> Conectando...
                </span>
                <span v-else>Conectar</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Contenido si Wi-Fi está APAGADO: Mostrar Ethernet -->
    <div v-else class="panel-content ethernet-view">
      <div class="ethernet-card">
        <div class="ethernet-icon-ring">
          <i class="bi bi-ethernet"></i>
        </div>
        <div class="ethernet-info">
          <h4>Conexión cableada Ethernet</h4>
          <span class="status-pill ok">
            <i class="bi bi-shield-fill-check"></i> Conectado • Internet
          </span>
          <p class="ethernet-spec">Ethernet 1 • 1000/1000 (Mbps)</p>
          <p class="ethernet-note">
            El Wi-Fi está desactivado. Tu equipo está utilizando la conexión de alta velocidad por cable Ethernet.
          </p>
        </div>

        <button
          class="action-btn enable-wifi-btn"
          type="button"
          @click="wifiStore.toggleWifi"
        >
          <i class="bi bi-wifi"></i> Activar Wi-Fi
        </button>
      </div>
    </div>

    <!-- Footer: Acceso a Configuración de Red -->
    <div class="panel-footer" @click="openNetworkSettings">
      <div class="footer-left">
        <i class="bi bi-gear-fill"></i>
        <span>Configuración de red e Internet</span>
      </div>
      <i class="bi bi-chevron-right footer-chevron"></i>
    </div>
  </div>
</template>

<style scoped>
.wifi-panel {
  width: 340px;
  max-height: 490px;
  background: rgba(14, 18, 28, 0.52);
  backdrop-filter: blur(36px) saturate(180%);
  -webkit-backdrop-filter: blur(36px) saturate(180%);
  border: 1px solid rgba(255, 255, 255, 0.16);
  border-radius: 14px;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.65), inset 0 1px 0 rgba(255, 255, 255, 0.2), 0 0 0 1px rgba(255, 255, 255, 0.06);
  color: #f1f5f9;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  user-select: none;
  font-family: inherit;
}

/* Header */
.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.09);
  background: rgba(255, 255, 255, 0.04);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
}

.header-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 700;
  color: #ffffff;
}

.header-title i {
  font-size: 16px;
  color: #38bdf8;
}

.switch-container {
  display: flex;
  align-items: center;
  gap: 8px;
}

.switch-label {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.65);
}

.toggle-switch {
  width: 40px;
  height: 22px;
  border-radius: 11px;
  background: rgba(255, 255, 255, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.25);
  position: relative;
  cursor: pointer;
  padding: 0;
  outline: none;
  transition: background 0.2s ease, border-color 0.2s ease;
}

.toggle-switch.active {
  background: #0284c7;
  border-color: #38bdf8;
}

.toggle-knob {
  position: absolute;
  top: 2px;
  left: 3px;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #ffffff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.4);
  transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.toggle-switch.active .toggle-knob {
  transform: translateX(17px);
}

/* Contenido scrollable */
.panel-content {
  padding: 12px;
  overflow-y: auto;
  max-height: 380px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.panel-content::-webkit-scrollbar {
  width: 5px;
}

.panel-content::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.2);
  border-radius: 3px;
}

/* Red conectada */
.connected-card {
  display: flex;
  flex-direction: column;
  gap: 6px;
  background: rgba(2, 132, 199, 0.16);
  border: 1px solid rgba(56, 189, 248, 0.38);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  border-radius: 10px;
  padding: 11px 13px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.15);
}

.card-icon {
  display: none;
}

.card-info {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.network-name {
  font-size: 14px;
  color: #ffffff;
}

.status-pill {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 11px;
  font-weight: 600;
  padding: 2px 7px;
  border-radius: 4px;
  width: fit-content;
}

.status-pill.ok {
  background: rgba(34, 197, 94, 0.16);
  color: #4ade80;
  border: 1px solid rgba(74, 222, 128, 0.3);
}

.network-details {
  font-size: 10.5px;
  color: rgba(255, 255, 255, 0.6);
  margin-top: 2px;
}

.card-action {
  margin-top: 4px;
  display: flex;
  justify-content: flex-end;
}

/* Botones */
.action-btn {
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: 6px;
  padding: 4px 12px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  outline: none;
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  transition: all 0.15s ease;
}

.disconnect-btn {
  background: rgba(255, 255, 255, 0.08);
  color: #f1f5f9;
}

.disconnect-btn:hover {
  background: rgba(239, 68, 68, 0.25);
  border-color: rgba(239, 68, 68, 0.5);
  color: #fecaca;
  box-shadow: 0 2px 8px rgba(239, 68, 68, 0.2);
}

.connect-btn {
  background: #0284c7;
  color: #ffffff;
  border-color: #38bdf8;
  box-shadow: 0 2px 10px rgba(2, 132, 199, 0.35);
}

.connect-btn:hover:not(:disabled) {
  background: #0369a1;
  box-shadow: 0 4px 14px rgba(2, 132, 199, 0.5);
}

.connect-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* Sección redes disponibles */
.section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 2px;
  padding: 0 4px;
}

.section-title {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: rgba(255, 255, 255, 0.5);
}

.refresh-btn {
  background: transparent;
  border: none;
  color: rgba(255, 255, 255, 0.6);
  cursor: pointer;
  font-size: 13px;
  padding: 2px 4px;
  border-radius: 4px;
  transition: color 0.15s ease, background 0.15s ease;
}

.refresh-btn:hover {
  color: #ffffff;
  background: rgba(255, 255, 255, 0.1);
}

.spinning {
  animation: spin 0.6s linear infinite;
  display: inline-block;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

/* Lista de redes */
.networks-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.network-item-wrap {
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  transition: all 0.15s ease;
}

.network-item-wrap:hover {
  background: rgba(255, 255, 255, 0.1);
  border-color: rgba(255, 255, 255, 0.2);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
  transform: translateY(-1px);
}

.network-item-wrap.is-expanded {
  background: rgba(255, 255, 255, 0.08);
  border-color: rgba(56, 189, 248, 0.45);
  box-shadow: 0 4px 16px rgba(2, 132, 199, 0.25);
}

.network-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 10px;
  cursor: pointer;
}

.net-left {
  display: flex;
  align-items: center;
  gap: 9px;
  font-size: 12.5px;
  font-weight: 500;
  color: #ffffff;
}

.net-signal {
  font-size: 14px;
  color: #38bdf8;
}

.net-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.net-lock {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.45);
}

.open-badge {
  font-size: 9.5px;
  padding: 1px 4px;
  background: rgba(234, 179, 8, 0.15);
  color: #fde047;
  border-radius: 3px;
}

.expand-chevron {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.4);
  transition: transform 0.2s ease;
}

.expand-chevron.rotated {
  transform: rotate(180deg);
}

/* Área desplegable */
.network-expand-area {
  padding: 4px 10px 10px 10px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
}

.auto-connect-row {
  display: flex;
  align-items: center;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  color: rgba(255, 255, 255, 0.7);
  cursor: pointer;
}

.connect-action-row {
  display: flex;
  justify-content: flex-end;
}

.mini-spinner {
  display: inline-block;
  width: 10px;
  height: 10px;
  border: 2px solid #ffffff;
  border-top-color: transparent;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
  margin-right: 5px;
  vertical-align: middle;
}

/* Vista Ethernet (cuando Wi-Fi está apagado) */
.ethernet-view {
  align-items: center;
  justify-content: center;
  padding: 20px 14px;
}

.ethernet-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 12px;
  width: 100%;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.1);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  border-radius: 12px;
  padding: 20px 14px;
  box-shadow: 0 4px 18px rgba(0, 0, 0, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.12);
}

.ethernet-icon-ring {
  width: 52px;
  height: 52px;
  border-radius: 50%;
  background: rgba(2, 132, 199, 0.18);
  border: 1.5px solid rgba(56, 189, 248, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 26px;
  color: #38bdf8;
  box-shadow: 0 0 20px rgba(2, 132, 199, 0.35);
}

.ethernet-info h4 {
  margin: 0 0 6px 0;
  font-size: 14px;
  font-weight: 700;
  color: #ffffff;
}

.ethernet-spec {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.65);
  margin: 6px 0 0 0;
}

.ethernet-note {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.5);
  margin: 6px 0 0 0;
  line-height: 1.45;
}

.enable-wifi-btn {
  margin-top: 8px;
  background: rgba(56, 189, 248, 0.15);
  border: 1px solid rgba(56, 189, 248, 0.45);
  color: #ffffff;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 7px 18px;
  border-radius: 8px;
  font-weight: 600;
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  transition: all 0.2s ease;
}

.enable-wifi-btn:hover {
  background: rgba(2, 132, 199, 0.4);
  border-color: rgba(56, 189, 248, 0.7);
  box-shadow: 0 0 16px rgba(2, 132, 199, 0.4);
}

/* Footer */
.panel-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 11px 16px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(10, 14, 22, 0.35);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  cursor: pointer;
  transition: background 0.15s ease, border-color 0.15s ease;
}

.panel-footer:hover {
  background: rgba(255, 255, 255, 0.08);
}

.footer-left {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 11.5px;
  color: rgba(255, 255, 255, 0.9);
}

.footer-left i {
  font-size: 14px;
  color: #38bdf8;
}

.footer-chevron {
  font-size: 11px;
  color: rgba(255, 255, 255, 0.45);
}
</style>
