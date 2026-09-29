export interface UserProfileData {
  name: string;
  avatar: Blob | null;
  setupDate: Date;
}

/**
 * Abre la base de datos NekomiOS_DB garantizando que el almacén 'user_data' exista,
 * incluso si una conexión previa creó la base de datos sin él.
 */
export async function openUserDataDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const checkReq = indexedDB.open('NekomiOS_DB');

    checkReq.onupgradeneeded = (e: any) => {
      const db = e.target.result as IDBDatabase;
      if (!db.objectStoreNames.contains('user_data')) {
        db.createObjectStore('user_data');
      }
    };

    checkReq.onsuccess = () => {
      const db = checkReq.result;
      if (!db.objectStoreNames.contains('user_data')) {
        const nextVersion = db.version + 1;
        db.close();

        const upgradeReq = indexedDB.open('NekomiOS_DB', nextVersion);
        upgradeReq.onupgradeneeded = (e: any) => {
          const uDb = e.target.result as IDBDatabase;
          if (!uDb.objectStoreNames.contains('user_data')) {
            uDb.createObjectStore('user_data');
          }
        };
        upgradeReq.onsuccess = () => resolve(upgradeReq.result);
        upgradeReq.onerror = () => reject(upgradeReq.error);
      } else {
        resolve(db);
      }
    };

    checkReq.onerror = () => reject(checkReq.error);
  });
}

/**
 * Guarda el perfil del usuario en IndexedDB y respaldo en localStorage.
 * Nunca lanza un error fatal para garantizar que la experiencia del usuario no se interrumpa.
 */
export async function saveUserProfile(
  userName: string,
  imageFile: Blob | File | null
): Promise<boolean> {
  const safeName = (userName && userName.trim()) || 'Usuario Frost';
  const setupDate = new Date();

  // Guardar en localStorage como respaldo inmediato
  try {
    localStorage.setItem('frost_username', safeName);
    localStorage.setItem('frost_user_setup_date', setupDate.toISOString());
  } catch (err) {
    console.warn('No se pudo guardar respaldo en localStorage:', err);
  }

  try {
    const db = await openUserDataDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction('user_data', 'readwrite');
      const store = tx.objectStore('user_data');

      store.put(
        {
          name: safeName,
          avatar: imageFile || null,
          setupDate
        },
        'profile'
      );

      tx.oncomplete = () => {
        db.close();
        resolve();
      };
      tx.onerror = () => reject(tx.error);
    });

    return true;
  } catch (e) {
    console.error('Error guardando perfil en IndexedDB, usando respaldo local:', e);
    return false;
  }
}

/**
 * Obtiene el perfil del usuario desde IndexedDB con respaldo en localStorage.
 */
export async function getUserProfile(): Promise<UserProfileData | null> {
  try {
    const db = await openUserDataDB();
    const result = await new Promise<any>((resolve) => {
      const tx = db.transaction('user_data', 'readonly');
      const store = tx.objectStore('user_data');
      const req = store.get('profile');

      req.onsuccess = () => {
        db.close();
        resolve(req.result || null);
      };
      req.onerror = () => {
        db.close();
        resolve(null);
      };
    });

    if (result) {
      return {
        name: result.name || localStorage.getItem('frost_username') || 'Usuario Frost',
        avatar: result.avatar instanceof Blob ? result.avatar : null,
        setupDate: result.setupDate ? new Date(result.setupDate) : new Date()
      };
    }
  } catch (e) {
    console.warn('Error leyendo perfil de IndexedDB:', e);
  }

  // Respaldo desde localStorage si no está en IndexedDB
  const localName = localStorage.getItem('frost_username');
  if (localName) {
    return {
      name: localName,
      avatar: null,
      setupDate: new Date()
    };
  }

  return null;
}
