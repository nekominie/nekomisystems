import JSZip from 'jszip'
import type { ZipTxtFile, Attachment } from '../types/chat'
import { parseVCard } from './vcard'

export class ZipReader {
  private zip: JSZip | null = null
  private fileMap = new Map<string, JSZip.JSZipObject>()
  private blobUrlCache = new Map<string, string>()
  private inFlightResolutions = new Map<string, Promise<void>>()

  /**
   * Loads a ZIP file and indexes its contents.
   */
  async loadZip(file: File | Blob): Promise<ZipTxtFile[]> {
    this.cleanup()
    this.zip = await JSZip.loadAsync(file)
    this.fileMap.clear()

    const txtFiles: ZipTxtFile[] = []

    for (const [relativePath, zipEntry] of Object.entries(this.zip.files)) {
      // Ignore directories and macOS metadata
      if (zipEntry.dir || relativePath.startsWith('__MACOSX/') || relativePath.includes('/.')) {
        continue
      }

      const baseName = relativePath.split('/').pop() || relativePath
      // Store in fileMap with various lookup keys (exact, lowercase, basename)
      this.fileMap.set(relativePath, zipEntry)
      this.fileMap.set(relativePath.toLowerCase(), zipEntry)
      this.fileMap.set(baseName, zipEntry)
      this.fileMap.set(baseName.toLowerCase(), zipEntry)

      if (baseName.toLowerCase().endsWith('.txt')) {
        const textSample = await zipEntry.async('string')
        const lines = textSample.split(/\r?\n/)
        txtFiles.push({
          name: baseName,
          relativePath,
          size: (zipEntry as any)._data?.uncompressedSize || textSample.length,
          lineCount: lines.length,
          sampleText: lines.slice(0, 5).join('\n'),
        })
      }
    }

    // Sort txt files: chats with more lines or named "_chat.txt" / "chat.txt" first
    txtFiles.sort((a, b) => {
      const aScore = a.name.toLowerCase().includes('chat') ? 10000 : 0
      const bScore = b.name.toLowerCase().includes('chat') ? 10000 : 0
      return (bScore + (b.lineCount || 0)) - (aScore + (a.lineCount || 0))
    })

    return txtFiles
  }

  /**
   * Reads the full text of a given text file inside the zip.
   */
  async readTxtFile(relativePath: string): Promise<string> {
    if (!this.zip) throw new Error('No hay ningún archivo ZIP cargado.')
    const entry = this.fileMap.get(relativePath) || this.fileMap.get(relativePath.toLowerCase())
    if (!entry) throw new Error(`Archivo ${relativePath} no encontrado en el ZIP.`)
    return await entry.async('string')
  }

  /**
   * Finds a file entry in the ZIP regardless of path prefix or casing.
   */
  findEntry(fileName: string): JSZip.JSZipObject | null {
    if (!this.zip) return null
    const cleanName = fileName.trim().replace(/^[\u200E\u200F\uFEFF]/, '')
    const baseName = cleanName.split('/').pop() || cleanName

    return (
      this.fileMap.get(cleanName) ||
      this.fileMap.get(cleanName.toLowerCase()) ||
      this.fileMap.get(baseName) ||
      this.fileMap.get(baseName.toLowerCase()) ||
      null
    )
  }

  /**
   * Returns a cached or newly created blob Object URL for a given filename.
   */
  async getMediaUrl(fileName: string): Promise<string | null> {
    if (!this.zip) return null
    const entry = this.findEntry(fileName)
    if (!entry) return null

    if (this.blobUrlCache.has(entry.name)) {
      return this.blobUrlCache.get(entry.name)!
    }

    const key = entry.name.toLowerCase()
    if (this.inFlightResolutions.has(key)) {
      await this.inFlightResolutions.get(key)
      return this.blobUrlCache.get(entry.name) || null
    }

    const promise = (async () => {
      const baseName = entry.name.toLowerCase()
      let mimeType = 'application/octet-stream'

      if (baseName.endsWith('.jpg') || baseName.endsWith('.jpeg')) mimeType = 'image/jpeg'
      else if (baseName.endsWith('.png')) mimeType = 'image/png'
      else if (baseName.endsWith('.gif')) mimeType = 'image/gif'
      else if (baseName.endsWith('.webp')) mimeType = 'image/webp'
      else if (baseName.endsWith('.opus')) mimeType = 'audio/ogg; codecs=opus'
      else if (baseName.endsWith('.ogg')) mimeType = 'audio/ogg'
      else if (baseName.endsWith('.mp3')) mimeType = 'audio/mpeg'
      else if (baseName.endsWith('.m4a') || baseName.endsWith('.aac')) mimeType = 'audio/mp4'
      else if (baseName.endsWith('.mp4')) mimeType = 'video/mp4'
      else if (baseName.endsWith('.3gp')) mimeType = 'video/3gpp'
      else if (baseName.endsWith('.pdf')) mimeType = 'application/pdf'
      else if (baseName.endsWith('.vcf')) mimeType = 'text/vcard'

      try {
        const blob = await entry.async('blob')
        const typedBlob = new Blob([blob], { type: mimeType })
        const url = URL.createObjectURL(typedBlob)
        this.blobUrlCache.set(entry.name, url)
      } catch (err) {
        console.warn('Error creating media url:', entry.name, err)
      }
    })()

    this.inFlightResolutions.set(key, promise)
    try {
      await promise
    } finally {
      this.inFlightResolutions.delete(key)
    }

    return this.blobUrlCache.get(entry.name) || null
  }

  /**
   * Retrieves a Blob and Blob URL for a given attachment file name on demand.
   * Deduplicates concurrent requests for the same media file.
   */
  async resolveAttachment(attachment: Attachment): Promise<void> {
    if (attachment.url || attachment.isMissing) return

    const key = attachment.fileName.toLowerCase().trim()
    if (this.inFlightResolutions.has(key)) {
      await this.inFlightResolutions.get(key)
      return
    }

    const resolutionPromise = (async () => {
      const entry = this.findEntry(attachment.fileName)
      if (!entry) {
        attachment.isMissing = true
        return
      }

      const url = await this.getMediaUrl(attachment.fileName)
      if (!url) {
        attachment.isMissing = true
        return
      }

      attachment.url = url
      attachment.size = (entry as any)._data?.uncompressedSize || 0

      // If it's a contact VCF, parse it
      if (attachment.type === 'contact') {
        const text = await entry.async('string')
        const parsedVcard = parseVCard(text)
        attachment.contactData = {
          name: parsedVcard.name,
          phone: parsedVcard.phone,
          email: parsedVcard.email,
          org: parsedVcard.org,
          rawVcard: parsedVcard.rawVcard,
        }
      }
    })()

    this.inFlightResolutions.set(key, resolutionPromise)
    try {
      await resolutionPromise
    } finally {
      this.inFlightResolutions.delete(key)
    }
  }

  /**
   * Retrieves all media files found in the zip for a Media Gallery view.
   * Runs synchronously and instantly by reading unique zip file entries.
   */
  getAllMediaFiles(): { name: string; relativePath: string; type: string; size: number }[] {
    const list: { name: string; relativePath: string; type: string; size: number }[] = []
    if (!this.zip) return list

    for (const [relativePath, entry] of Object.entries(this.zip.files)) {
      if (entry.dir || relativePath.startsWith('__MACOSX/') || relativePath.includes('/.')) continue
      const baseName = relativePath.split('/').pop() || relativePath
      const lower = baseName.toLowerCase()
      if (lower.endsWith('.txt')) continue

      let type = 'document'
      if (lower.startsWith('stk-') || lower.includes('sticker') || lower.endsWith('.webp')) {
        type = 'sticker'
      } else if (/\.(jpg|jpeg|png|gif|bmp|heic|svg)$/i.test(lower)) {
        type = 'image'
      } else if (/\.(opus|ogg|mp3|m4a|wav|aac|amr)$/i.test(lower) || lower.startsWith('ptt-')) {
        type = 'audio'
      } else if (/\.(mp4|3gp|mov|mkv|webm)$/i.test(lower) || lower.startsWith('vid-')) {
        type = 'video'
      } else if (/\.vcf$/i.test(lower)) {
        type = 'contact'
      }

      list.push({
        name: baseName,
        relativePath,
        type,
        size: (entry as any)._data?.uncompressedSize || 0,
      })
    }

    return list
  }

  /**
   * Releases allocated blob URLs and clears state.
   */
  cleanup() {
    for (const url of this.blobUrlCache.values()) {
      URL.revokeObjectURL(url)
    }
    this.blobUrlCache.clear()
    this.inFlightResolutions.clear()
    this.fileMap.clear()
    this.zip = null
  }
}
