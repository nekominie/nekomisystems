import { defineStore } from 'pinia';
import { ref } from 'vue';
import { db, type FileItem } from '../../../../database/db';

export const useNotepadStore = defineStore('notepad', () => {
  const currentFile = ref<FileItem | null>(null);
  const fileName = ref<string>('untitled.txt');
  const text = ref<string>('');
  const isDirty = ref<boolean>(false);
  const lastSavedText = ref<string>('');
  const statusMessage = ref<string>('');

  async function openTextFromFile(fileItem: FileItem) {
    let content = fileItem.textContent ?? '';

    if (!content && fileItem.assetId) {
      try {
        const asset = await db.assets.get(fileItem.assetId);
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

    currentFile.value = fileItem;
    fileName.value = fileItem.name || 'untitled.txt';
    text.value = content;
    lastSavedText.value = content;
    isDirty.value = false;
    statusMessage.value = `Abierto: ${fileItem.name}`;
  }

  async function saveCurrentFile(): Promise<boolean> {
    if (!currentFile.value) {
      return false;
    }

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
      statusMessage.value = `Guardado: ${currentFile.value.name}`;

      // Notificar al explorador de archivos para actualizar la interfaz
      try {
        const { useFileSystemStore } = await import('../explorer/file_system_store');
        const fs = useFileSystemStore();
        await fs.loadAllFiles();
      } catch {}

      return true;
    } catch (e) {
      console.error('Error guardando archivo en Notepad:', e);
      return false;
    }
  }

  async function saveAsNewFile(targetName: string, folderId = 'documents'): Promise<FileItem | null> {
    try {
      const { useFileSystemStore } = await import('../explorer/file_system_store');
      const fs = useFileSystemStore();
      const trimmed = targetName.trim() || 'documento.txt';
      const finalName = trimmed.endsWith('.txt') ? trimmed : `${trimmed}.txt`;
      const newFile = await fs.createNewFile(folderId, finalName, text.value);
      currentFile.value = newFile;
      fileName.value = newFile.name;
      lastSavedText.value = text.value;
      isDirty.value = false;
      statusMessage.value = `Guardado en ${folderId === 'desktop' ? 'Escritorio' : 'Documentos'}: ${newFile.name}`;
      return newFile;
    } catch (err) {
      console.error('Error guardando nuevo archivo en Notepad:', err);
      return null;
    }
  }

  function resetDocument() {
    currentFile.value = null;
    fileName.value = 'untitled.txt';
    text.value = '';
    lastSavedText.value = '';
    isDirty.value = false;
    statusMessage.value = 'Nuevo documento listo';
  }

  return {
    currentFile,
    fileName,
    text,
    isDirty,
    lastSavedText,
    statusMessage,
    openTextFromFile,
    saveCurrentFile,
    saveAsNewFile,
    resetDocument,
  };
});
