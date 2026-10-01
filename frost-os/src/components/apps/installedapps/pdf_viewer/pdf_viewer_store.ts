import { defineStore } from 'pinia'
import { ref } from 'vue'
import { db, type FileItem } from '../../../../database/db'

export interface PdfPage {
  pageNum: number
  title: string
  subtitle?: string
  content: string
  sections?: { heading: string; body: string }[]
}

export interface PdfDocument {
  id: string
  name: string
  url?: string
  size?: string
  pageCount: number
  source: 'file' | 'system' | 'sample'
  fileItem?: FileItem
  pages?: PdfPage[]
}

const SAMPLE_MANUAL: PdfDocument = {
  id: 'sample-manual',
  name: 'Manual_de_Usuario_FrostOS.pdf',
  size: '1.4 MB',
  pageCount: 3,
  source: 'sample',
  pages: [
    {
      pageNum: 1,
      title: 'Manual de Usuario de Frost OS',
      subtitle: 'Versión 2.5 • Sistema Operativo Web de Próxima Generación',
      content: `Bienvenido a Frost OS, un entorno de escritorio completo diseñado con arquitectura web moderna, interfaz de vidrio acrílico (Glass Blur) y sincronización persistente en tiempo real.

Este documento contiene la información esencial para aprovechar al máximo las capacidades del sistema, administrar tus aplicaciones y organizar tus archivos.`,
      sections: [
        {
          heading: '1. Introducción al Escritorio',
          body: 'El escritorio de Frost OS combina un sistema de ventanas flotantes multiproceso con soporte de redimensionamiento libre, alineación magnética (Snap Layouts), barra de tareas dinámica e integración de System Tray con widgets interactivos.'
        },
        {
          heading: '2. Barra de Tareas y Menú de Inicio',
          body: 'Desde el menú de inicio puedes acceder a todas las aplicaciones instaladas, buscar por nombre o publicador y anclar tus programas favoritos. La barra de tareas muestra vistas previas de ventanas al pasar el cursor y menús contextuales avanzados con clic derecho.'
        }
      ]
    },
    {
      pageNum: 2,
      title: 'Gestión de Archivos y Almacenamiento',
      subtitle: 'Explorador de Archivos, Escritorio y Visor de Documentos',
      content: `Frost OS cuenta con un sistema de archivos virtual persistente impulsado por IndexedDB (Dexie.js), permitiéndote almacenar documentos, fotos, música y aplicaciones sin perder tus datos al recargar la página.`,
      sections: [
        {
          heading: '3. Explorador de Archivos Moderno',
          body: 'El explorador permite crear carpetas, arrastrar y soltar archivos reales desde tu equipo (Drag & Drop), renombrar, cortar, copiar y pegar elementos. Los archivos creados en el Escritorio se sincronizan bidireccionalmente con la carpeta Escritorio del Explorador.'
        },
        {
          heading: '4. Visor de PDF Integrado',
          body: 'Esta aplicación (PDF Viewer) se integra de forma predeterminada con todos los archivos con extensión .pdf. Puedes hacer doble clic en cualquier documento para visualizarlo, ajustar el zoom, rotar la orientación e imprimir o exportar el documento.'
        }
      ]
    },
    {
      pageNum: 3,
      title: 'Tienda de Aplicaciones y Personalización',
      subtitle: 'Catálogo de Apps, Consola de Comandos y Ajustes',
      content: `Personaliza tu experiencia de trabajo configurando fondos de pantalla, widgets de escritorio interactivos y descargando nuevas herramientas desde la Tienda de Apps oficial.`,
      sections: [
        {
          heading: '5. Tienda de Apps (App Store)',
          body: 'Explora una amplia selección de aplicaciones y juegos. La tienda incluye simulación realista de descarga con cálculo de tiempo según el peso del archivo, verificación de firmas e instalación en un clic.'
        },
        {
          heading: '6. Atajos de Teclado Útiles',
          body: '• Esc: Cierra modales y paneles flotantes.\n• Enter: Abre archivos o ejecuta comandos.\n• Doble clic en barra de título: Maximiza o restaura cualquier ventana.\n• Clic derecho: Abre menús contextuales adaptados al elemento seleccionado.'
        }
      ]
    }
  ]
}

const SAMPLE_TERMS: PdfDocument = {
  id: 'sample-terms',
  name: 'Terminos_y_Condiciones.pdf',
  size: '840 KB',
  pageCount: 2,
  source: 'sample',
  pages: [
    {
      pageNum: 1,
      title: 'Términos de Servicio y Licencia',
      subtitle: 'Frost OS Software License Agreement',
      content: `Lea detenidamente este documento antes de utilizar el entorno operativo Frost OS y sus componentes asociados.

El software se proporciona "tal cual", sin garantías de ningún tipo, expresas o implícitas, incluyendo pero no limitándose a garantías de comerciabilidad o idoneidad para un propósito en particular.`,
      sections: [
        {
          heading: 'Cláusula 1: Licencia de Uso',
          body: 'Se concede permiso sin cargo a cualquier persona que obtenga una copia de este software para utilizarlo, modificarlo y distribuirlo con fines educativos o personales.'
        },
        {
          heading: 'Cláusula 2: Privacidad y Almacenamiento Local',
          body: 'Todos los datos, imágenes y documentos generados en Frost OS se almacenan exclusivamente en el almacenamiento local del navegador (IndexedDB / LocalStorage) y nunca se transmiten a servidores externos sin su consentimiento explícito.'
        }
      ]
    },
    {
      pageNum: 2,
      title: 'Responsabilidad y Derechos de Autor',
      subtitle: 'Frost Corporation • Todos los derechos reservados',
      content: `Las marcas comerciales, logotipos y diseños visuales de Frost OS pertenecen a sus respectivos desarrolladores y a Nekomi Systems.`,
      sections: [
        {
          heading: 'Cláusula 3: Limitación de Responsabilidad',
          body: 'En ningún caso los autores o titulares de derechos serán responsables de reclamos, daños u otras responsabilidades que surjan del uso o la imposibilidad de uso del software.'
        },
        {
          heading: 'Contacto y Soporte',
          body: 'Para reportar incidencias, sugerir funciones o contribuir al desarrollo de Frost OS, visite el repositorio oficial del proyecto.'
        }
      ]
    }
  ]
}

export const usePdfViewerStore = defineStore('pdf_viewer', () => {
  const currentPdf = ref<PdfDocument | null>(SAMPLE_MANUAL)
  const recentPdfs = ref<PdfDocument[]>([SAMPLE_MANUAL, SAMPLE_TERMS])
  const currentPage = ref<number>(1)
  const zoom = ref<number>(100)
  const rotation = ref<number>(0)
  const sidebarOpen = ref<boolean>(true)

  const openPdf = (doc: PdfDocument) => {
    currentPdf.value = doc
    currentPage.value = 1
    zoom.value = 100
    rotation.value = 0

    if (!recentPdfs.value.some(d => d.id === doc.id)) {
      recentPdfs.value.unshift(doc)
    }
  }

  const createPdfDocumentFromFile = async (fileItem: FileItem): Promise<PdfDocument> => {
    let pdfUrl = ''
    let content = fileItem.textContent || ''

    if (fileItem.assetId) {
      const asset = await db.assets.get(fileItem.assetId)
      if (asset && asset.data) {
        if (asset.data instanceof Blob) {
          pdfUrl = URL.createObjectURL(asset.data)
        }
      }
    }

    // Comprobar si coincide con alguno de los documentos de muestra
    const sampleMatch = [SAMPLE_MANUAL, SAMPLE_TERMS].find(
      s => s.name.toLowerCase() === fileItem.name.toLowerCase()
    )

    if (sampleMatch && !pdfUrl) {
      return {
        ...sampleMatch,
        id: fileItem.id,
        name: fileItem.name,
        fileItem,
        source: 'file'
      }
    }

    return {
      id: fileItem.id,
      name: fileItem.name,
      url: pdfUrl,
      size: formatFileSize(fileItem.size),
      pageCount: 1,
      source: 'file',
      fileItem,
      pages: [
        {
          pageNum: 1,
          title: fileItem.name.replace(/\.pdf$/i, ''),
          subtitle: `Documento PDF importado • ${formatFileSize(fileItem.size)}`,
          content: content || 'Visualizando contenido del documento PDF.',
          sections: [
            {
              heading: 'Información del Archivo',
              body: `Nombre: ${fileItem.name}\nTamaño: ${formatFileSize(fileItem.size)}\nRuta: /${fileItem.parentId || 'archivos'}\nFecha de modificación: ${new Date(fileItem.updatedAt || Date.now()).toLocaleString('es-ES')}`
            }
          ]
        }
      ]
    }
  }

  const openPdfFromFile = async (fileItem: FileItem) => {
    const doc = await createPdfDocumentFromFile(fileItem)
    openPdf(doc)
  }

  const nextPage = () => {
    if (currentPdf.value && currentPage.value < currentPdf.value.pageCount) {
      currentPage.value++
    }
  }

  const prevPage = () => {
    if (currentPage.value > 1) {
      currentPage.value--
    }
  }

  const setPage = (p: number) => {
    if (currentPdf.value && p >= 1 && p <= currentPdf.value.pageCount) {
      currentPage.value = p
    }
  }

  const zoomIn = () => {
    if (zoom.value < 250) zoom.value += 15
  }

  const zoomOut = () => {
    if (zoom.value > 50) zoom.value -= 15
  }

  const resetZoom = () => {
    zoom.value = 100
  }

  const rotateClockwise = () => {
    rotation.value = (rotation.value + 90) % 360
  }

  const toggleSidebar = () => {
    sidebarOpen.value = !sidebarOpen.value
  }

  function formatFileSize(bytes: number = 0): string {
    if (bytes === 0) return '0 KB'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
  }

  return {
    currentPdf,
    recentPdfs,
    currentPage,
    zoom,
    rotation,
    sidebarOpen,
    openPdf,
    openPdfFromFile,
    createPdfDocumentFromFile,
    nextPage,
    prevPage,
    setPage,
    zoomIn,
    zoomOut,
    resetZoom,
    rotateClockwise,
    toggleSidebar,
    SAMPLE_MANUAL,
    SAMPLE_TERMS
  }
})
