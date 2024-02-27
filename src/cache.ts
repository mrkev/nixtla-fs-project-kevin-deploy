class OPFSTypedCache<T> {
  private constructor(private readonly root: FileSystemDirectoryHandle) {}
  public static async create<T>() {
    const opfsRoot = await navigator.storage.getDirectory();
    return new OPFSTypedCache<T>(opfsRoot);
  }

  async get(key: string): Promise<T | null> {
    try {
      const handle = await this.root.getFileHandle(key);
      const file = await handle.getFile();
      return JSON.parse(await file.text());
    } catch (e) {
      console.error(e);
      return null;
    }
  }

  async set(key: string, value: T) {
    const file = await this.root.getFileHandle(key, {
      create: false,
    });

    const writable = await file.createWritable();
    await writable.write(JSON.stringify(value));
    await writable.close();
  }
}

import { openDB, deleteDB, wrap, unwrap, IDBPDatabase } from "idb";

export class IDBRepoCache<T> {
  private constructor(private readonly db: IDBPDatabase) {}
  static async connect<T>(dbname: string, v: number) {
    const db = await openDB(dbname, v, {
      upgrade(db) {
        const objectStore = db.createObjectStore("repos", { keyPath: "name" });
        objectStore.createIndex("owner", "owern", { unique: false });
      },
    });

    return new IDBRepoCache<T>(db);
  }

  async get(key: string) {
    return this.db.get("repos", key);
  }
  async set(key: string, val: T) {
    return this.db.put("keyval", val, key);
  }
  async del(key: string) {
    return this.db.delete("keyval", key);
  }
  async clear() {
    return this.db.clear("keyval");
  }
  async keys() {
    return this.db.getAllKeys("keyval");
  }
}

const dbPromise = openDB("keyval-store", 1, {
  upgrade(db) {
    db.createObjectStore("keyval");
  },
});

export async function get(key: string) {
  return (await dbPromise).get("keyval", key);
}
export async function set(key: string, val: any) {
  return (await dbPromise).put("keyval", val, key);
}
export async function del(key: string) {
  return (await dbPromise).delete("keyval", key);
}
export async function clear() {
  return (await dbPromise).clear("keyval");
}
export async function keys() {
  return (await dbPromise).getAllKeys("keyval");
}
