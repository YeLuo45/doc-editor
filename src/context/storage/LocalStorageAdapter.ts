// LocalStorage Adapter - Browser localStorage wrapper for persistence

export class LocalStorageAdapter {
  private prefix: string;

  constructor(prefix = 'doc-editor:') {
    this.prefix = prefix;
  }

  get(key: string): any {
    try {
      const item = localStorage.getItem(this.prefix + key);
      if (item === null) return null;
      return JSON.parse(item);
    } catch {
      return null;
    }
  }

  set(key: string, value: any): void {
    try {
      localStorage.setItem(this.prefix + key, JSON.stringify(value));
    } catch (e) {
      console.error('LocalStorage set error:', e);
    }
  }

  remove(key: string): void {
    localStorage.removeItem(this.prefix + key);
  }

  clear(): void {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(this.prefix)) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(key => localStorage.removeItem(key));
  }
}

export const storageAdapter = new LocalStorageAdapter();
