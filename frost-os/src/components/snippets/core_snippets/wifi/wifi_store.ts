import { defineStore } from 'pinia'
import { ref } from 'vue'

export interface WifiNetwork {
  ssid: string
  signal: number // 1 to 5
  security: string
  isSecured: boolean
  frequency: string
}

const STORAGE_KEY = 'frost_wifi_state_v1'

export const useWifiStore = defineStore('wifi', () => {
  const wifiEnabled = ref(true)
  const connectedSsid = ref<string | null>('NekomiNet_5G')
  const isConnectingTo = ref<string | null>(null)
  const ethernetConnected = ref(true)

  const defaultNetworks: WifiNetwork[] = [
    { ssid: 'NekomiNet_5G', signal: 5, security: 'WPA3-Personal', isSecured: true, frequency: '5 GHz' },
    { ssid: 'Hikari_Fiber_980', signal: 4, security: 'WPA2-Personal', isSecured: true, frequency: '5 GHz' },
    { ssid: 'CyberCafe_Free_WiFi', signal: 4, security: 'Abierta', isSecured: false, frequency: '2.4 GHz' },
    { ssid: 'FrostOS_Guest_HighSpeed', signal: 3, security: 'WPA2/WPA3', isSecured: true, frequency: '5 GHz' },
    { ssid: 'MikuFan_Club_VIP', signal: 3, security: 'WPA2-Personal', isSecured: true, frequency: '2.4 GHz' },
    { ssid: 'Neighbour_Home_2.4G', signal: 2, security: 'WPA2-Personal', isSecured: true, frequency: '2.4 GHz' },
  ]

  const networks = ref<WifiNetwork[]>([...defaultNetworks])

  function loadState() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        if (typeof parsed.wifiEnabled === 'boolean') {
          wifiEnabled.value = parsed.wifiEnabled
        }
        if (parsed.connectedSsid !== undefined) {
          connectedSsid.value = parsed.connectedSsid
        }
      }
    } catch (e) {
      console.warn('[WifiStore] Error loading state:', e)
    }
  }

  function saveState() {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({
          wifiEnabled: wifiEnabled.value,
          connectedSsid: connectedSsid.value,
        })
      )
    } catch (e) {
      console.warn('[WifiStore] Error saving state:', e)
    }
  }

  function toggleWifi() {
    wifiEnabled.value = !wifiEnabled.value
    saveState()
  }

  function setWifiEnabled(enabled: boolean) {
    wifiEnabled.value = enabled
    saveState()
  }

  async function connect(ssid: string) {
    isConnectingTo.value = ssid
    await new Promise((res) => setTimeout(res, 750))
    connectedSsid.value = ssid
    isConnectingTo.value = null
    saveState()
  }

  function disconnect() {
    connectedSsid.value = null
    saveState()
  }

  loadState()

  return {
    wifiEnabled,
    connectedSsid,
    isConnectingTo,
    ethernetConnected,
    networks,
    toggleWifi,
    setWifiEnabled,
    connect,
    disconnect,
  }
})
