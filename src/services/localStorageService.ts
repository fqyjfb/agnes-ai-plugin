export class LocalStorageService {
  static getItem<T>(key: string): T | null {
    try {
      const value = localStorage.getItem(key);
      if (value === null) return null;
      return JSON.parse(value) as T;
    } catch {
      return null;
    }
  }

  static setItem<T>(key: string, value: T): void {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error('Failed to set localStorage item:', error);
    }
  }

  static removeItem(key: string): void {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error('Failed to remove localStorage item:', error);
    }
  }

  static clear(): void {
    try {
      localStorage.clear();
    } catch (error) {
      console.error('Failed to clear localStorage:', error);
    }
  }

  static key(index: number): string | null {
    try {
      return localStorage.key(index);
    } catch (error) {
      return null;
    }
  }

  static get length(): number {
    try {
      return localStorage.length;
    } catch {
      return 0;
    }
  }
}