// Kerangka antrian upload offline (docs/13 §4). IndexedDB menyimpan blob + metadata
// saat offline, lalu disinkronkan ketika online. Diaktifkan penuh pada tahap PWA.
// Aman dipanggil hanya di browser.

const DB_NAME = "impactaqiqah";
const STORE = "upload_queue";

export interface QueuedUpload {
  id: string;
  orderId: string;
  stage: string;
  type: string;
  caption?: string;
  blob: Blob;
  createdAt: number;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function enqueueUpload(
  item: Omit<QueuedUpload, "id" | "createdAt">,
): Promise<string> {
  const db = await openDb();
  const id = crypto.randomUUID();
  const record: QueuedUpload = { ...item, id, createdAt: Date.now() };
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(record);
    tx.oncomplete = () => resolve(id);
    tx.onerror = () => reject(tx.error);
  });
}

export async function listQueued(): Promise<QueuedUpload[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).getAll();
    req.onsuccess = () => resolve(req.result as QueuedUpload[]);
    req.onerror = () => reject(req.error);
  });
}

export async function dequeue(id: string): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
