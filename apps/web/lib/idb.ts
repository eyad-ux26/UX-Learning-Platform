// Tiny IndexedDB wrapper. Everything a learner commits goes here first so nothing is lost offline.
const DB = "uxgate";
const VERSION = 1;

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB, VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains("kv")) db.createObjectStore("kv");
      if (!db.objectStoreNames.contains("queue")) db.createObjectStore("queue", { keyPath: "key" });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function run<T>(store: "kv" | "queue", mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await open();
  return new Promise<T>((resolve, reject) => {
    const tx = db.transaction(store, mode);
    const req = fn(tx.objectStore(store));
    tx.oncomplete = () => { db.close(); resolve(req.result); };
    tx.onerror = tx.onabort = () => { db.close(); reject(tx.error); };
  });
}

export const kvGet = <T,>(key: string) => run<T | undefined>("kv", "readonly", (s) => s.get(key));
export const kvSet = (key: string, value: unknown) => run("kv", "readwrite", (s) => s.put(value, key));
export const kvDel = (key: string) => run("kv", "readwrite", (s) => s.delete(key));
export const queuePut = (item: { key: string }) => run("queue", "readwrite", (s) => s.put(item));
export const queueAll = <T,>() => run<T[]>("queue", "readonly", (s) => s.getAll());
export const queueDel = (key: string) => run("queue", "readwrite", (s) => s.delete(key));
