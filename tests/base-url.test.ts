/**
 * La base de la API sale de un panel de despliegue, no del repositorio.
 *
 * Ahi es facil que el valor arrastre un espacio al final o una marca BOM
 * invisible. Cuando eso pasa, `${BASE}/api/...` deja de ser una URL absoluta:
 * el navegador la resuelve contra el propio dominio del frontend y devuelve un
 * 405 que no dice nada sobre la causa. Paso de verdad en el primer despliegue.
 */

import { describe, expect, it } from "vitest";

/** Misma normalizacion que aplica `src/api/cliente.ts` al arrancar. */
function normalizar(valor: string | undefined): string {
  return (valor ?? "")
    .replace(/^﻿/, "")
    .trim()
    .replace(/\/+$/, "");
}

const LIMPIA = "https://censo-iqbf-back.onrender.com";

describe("base de la API", () => {
  it("quita la marca BOM que dejan algunas consolas al pegar el valor", () => {
    expect(normalizar("﻿" + LIMPIA)).toBe(LIMPIA);
  });

  it("quita los espacios de los extremos", () => {
    expect(normalizar(`  ${LIMPIA} `)).toBe(LIMPIA);
    expect(normalizar(`${LIMPIA}\n`)).toBe(LIMPIA);
  });

  it("quita la barra final para no construir rutas con doble barra", () => {
    expect(normalizar(`${LIMPIA}/`)).toBe(LIMPIA);
    expect(normalizar(`${LIMPIA}///`)).toBe(LIMPIA);
  });

  it("deja intacto un valor ya correcto", () => {
    expect(normalizar(LIMPIA)).toBe(LIMPIA);
  });

  it("sigue permitiendo el valor vacio, que es el modo de desarrollo", () => {
    // En desarrollo no hay VITE_API_URL: el proxy de Vite atiende /api.
    expect(normalizar(undefined)).toBe("");
    expect(normalizar("")).toBe("");
  });

  it("el resultado siempre produce una URL absoluta utilizable", () => {
    const sucio = `﻿  ${LIMPIA}/  `;
    const ruta = `${normalizar(sucio)}/api/auth/login`;
    expect(ruta).toBe(`${LIMPIA}/api/auth/login`);
    expect(() => new URL(ruta)).not.toThrow();
  });
});
