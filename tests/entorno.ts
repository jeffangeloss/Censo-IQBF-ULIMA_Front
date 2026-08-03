/**
 * Entorno minimo para probar en Node lo que en produccion corre en el telefono.
 *
 * Solo se sustituye lo que el navegador presta: el almacen IndexedDB y
 * localStorage. La logica bajo prueba es la misma que se empaqueta.
 */

import "fake-indexeddb/auto";

class AlmacenLocal implements Storage {
  private datos = new Map<string, string>();

  get length(): number {
    return this.datos.size;
  }

  clear(): void {
    this.datos.clear();
  }

  getItem(clave: string): string | null {
    return this.datos.get(clave) ?? null;
  }

  key(indice: number): string | null {
    return [...this.datos.keys()][indice] ?? null;
  }

  removeItem(clave: string): void {
    this.datos.delete(clave);
  }

  setItem(clave: string, valor: string): void {
    this.datos.set(clave, String(valor));
  }
}

globalThis.localStorage = new AlmacenLocal();
