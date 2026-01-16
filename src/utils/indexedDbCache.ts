import type { IndexedPdf } from '../types/pdf'

const DB_NAME = 'pdf-index-cache'
const STORE_NAME = 'indexes'
const STORAGE_KEY = 'cache'

const isSupported = typeof window !== 'undefined' && typeof window.indexedDB !== 'undefined'

export interface CachedIndexPayload {
  signature: string
  pdfs: IndexedPdf[]
}
    
const openDatabase = (): Promise<IDBDatabase> =>
  new Promise((resolve, reject) => {
    const request = window.indexedDB.open(DB_NAME, 1)
  
    request.onerror = () => {
      reject(request.error ?? new Error('Не удалось открыть IndexedDB'))
    }
                       
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME)
      }
    }
                                                          
    request.onsuccess = () => {
      resolve(request.result)
    }
  })

export const readIndexCache = async (): Promise<CachedIndexPayload | null> => {
  if (!isSupported) {
    return null
  }

  try {
    const db = await openDatabase()

    return await new Promise<CachedIndexPayload | null>((resolve) => {
      const transaction = db.transaction(STORE_NAME, 'readonly')
      const store = transaction.objectStore(STORE_NAME)
      const request = store.get(STORAGE_KEY)

      request.onerror = () => {
        resolve(null)
      }

      request.onsuccess = () => {
        resolve((request.result as CachedIndexPayload | undefined) ?? null)
      }

      transaction.oncomplete = () => {
        db.close()
      }
    })
  } catch (error) {
    console.warn('Не удалось прочитать индекс из IndexedDB', error)
    return null
  }
}

export const writeIndexCache = async (payload: CachedIndexPayload) => {
  if (!isSupported) {
    return
  }

  try {
    const db = await openDatabase()

    await new Promise<void>((resolve) => {
      const transaction = db.transaction(STORE_NAME, 'readwrite')
      const store = transaction.objectStore(STORE_NAME)
      const request = store.put(payload, STORAGE_KEY)

      request.onerror = () => {
        resolve()
      }

      request.onsuccess = () => {
        resolve()
      }

      transaction.oncomplete = () => {
        db.close()
      }
    })
  } catch (error) {
    console.warn('Не удалось сохранить индекс в IndexedDB', error)
  }
}
