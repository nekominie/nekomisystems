const DEARFLIP_BASE_RELATIVE_URL = '../dflip/'

let loadPromise: Promise<void> | null = null

const resolveDearFlipBaseUrl = () => new URL(DEARFLIP_BASE_RELATIVE_URL, window.location.href).toString()

const loadStylesheet = (href: string, id: string) =>
  new Promise<void>((resolve, reject) => {
    const existing = document.getElementById(id) as HTMLLinkElement | null

    if (existing) {
      resolve()
      return
    }

    const link = document.createElement('link')
    link.id = id
    link.rel = 'stylesheet'
    link.href = href
    link.onload = () => resolve()
    link.onerror = () => reject(new Error(`No se pudo cargar la hoja de estilos: ${href}`))
    document.head.appendChild(link)
  })

const loadScript = (src: string, id: string) =>
  new Promise<void>((resolve, reject) => {
    const existing = document.getElementById(id) as HTMLScriptElement | null

    if (existing) {
      if (existing.dataset.loaded === 'true') {
        resolve()
        return
      }

      existing.addEventListener('load', () => resolve(), { once: true })
      existing.addEventListener(
        'error',
        () => reject(new Error(`No se pudo cargar el script: ${src}`)),
        { once: true }
      )
      return
    }

    const script = document.createElement('script')
    script.id = id
    script.src = src
    script.async = false
    script.dataset.loaded = 'false'
    script.onload = () => {
      script.dataset.loaded = 'true'
      resolve()
    }
    script.onerror = () => reject(new Error(`No se pudo cargar el script: ${src}`))
    document.head.appendChild(script)
  })

const configureDearFlipDefaults = (baseUrl: string) => {
  window.dFlipLocation = baseUrl

  const defaults = window.DFLIP?.defaults

  if (!defaults) {
    return
  }

  defaults.mockupjsSrc = `${baseUrl}js/libs/mockup.min.js`
  defaults.pdfjsSrc = `${baseUrl}js/libs/pdf.min.js`
  defaults.pdfjsCompatibilitySrc = `${baseUrl}js/libs/compatibility.js`
  defaults.threejsSrc = `${baseUrl}js/libs/three.min.js`
  defaults.pdfjsWorkerSrc = `${baseUrl}js/libs/pdf.worker.min.js`
  defaults.soundFile = `${baseUrl}sound/turn2.mp3`
  defaults.imagesLocation = `${baseUrl}images`
  defaults.imageResourcesPath = `${baseUrl}images/pdfjs/`
  defaults.cMapUrl = `${baseUrl}js/libs/cmaps/`
}

export const ensureDearFlipAssets = async () => {
  const baseUrl = resolveDearFlipBaseUrl()

  if (window.DFLIP && window.jQuery?.fn?.flipBook) {
    configureDearFlipDefaults(baseUrl)
    return
  }

  if (!loadPromise) {
    loadPromise = (async () => {
      await Promise.all([
        loadStylesheet(`${baseUrl}css/dflip.min.css`, 'dearflip-style'),
        loadStylesheet(`${baseUrl}css/themify-icons.min.css`, 'dearflip-icons'),
      ])

      if (!window.jQuery) {
        await loadScript(`${baseUrl}js/libs/jquery.min.js`, 'dearflip-jquery')
      }

      if (!window.DFLIP || !window.jQuery?.fn?.flipBook) {
        await loadScript(`${baseUrl}js/dflip.min.js`, 'dearflip-script')
      }

      configureDearFlipDefaults(baseUrl)
    })().catch((error) => {
      loadPromise = null
      throw error
    })
  }

  return loadPromise
}
