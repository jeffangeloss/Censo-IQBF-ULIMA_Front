/**
 * Pruebas del cliente HTTP.
 *
 * Lo que importa no es que sepa hacer fetch, sino que separe bien tres casos
 * que la cola trata distinto: el servidor dijo que no, no hubo respuesta, y la
 * sesion se cayo.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  ErrorApi,
  ErrorDeRed,
  alPerderSesion,
  api,
  guardarToken,
  leerToken,
} from "@/api/cliente";

function respuesta(status: number, cuerpo?: unknown): Response {
  return {
    status,
    ok: status >= 200 && status < 300,
    text: async () => (cuerpo === undefined ? "" : JSON.stringify(cuerpo)),
  } as unknown as Response;
}

function problema(status: number, code: string): Record<string, unknown> {
  return {
    type: "about:blank",
    title: "Error",
    status,
    detail: "detalle",
    code,
    request_id: "req-1",
  };
}

function simularFetch(): ReturnType<typeof vi.fn> {
  const simulado = vi.fn();
  globalThis.fetch = simulado as unknown as typeof fetch;
  return simulado;
}

beforeEach(() => {
  vi.restoreAllMocks();
  guardarToken(null);
});

describe("clasificacion de errores", () => {
  it("da por definitivo lo que el servidor juzgo del contenido", () => {
    for (const status of [400, 404, 409, 422]) {
      expect(new ErrorApi(status, "X", "m").definitivo).toBe(true);
    }
  });

  it("no da por definitivo lo que solo pide reintentar o reautenticar", () => {
    for (const status of [401, 403, 408, 429, 500, 503]) {
      expect(new ErrorApi(status, "X", "m").definitivo).toBe(false);
    }
  });
});

describe("respuestas del servidor", () => {
  it("convierte la ausencia de respuesta en un error de red", async () => {
    simularFetch().mockRejectedValue(new TypeError("Failed to fetch"));

    await expect(api.yo()).rejects.toBeInstanceOf(ErrorDeRed);
  });

  it("conserva el codigo del contrato al fallar", async () => {
    simularFetch().mockResolvedValue(
      respuesta(409, problema(409, "ENVASE_EN_CONFLICTO")),
    );

    await expect(api.envase(63)).rejects.toMatchObject({
      codigo: "ENVASE_EN_CONFLICTO",
      status: 409,
    });
  });

  it("acepta una respuesta sin cuerpo", async () => {
    guardarToken("token-abc");
    simularFetch().mockResolvedValue(respuesta(204));

    await expect(api.logout()).resolves.toBeUndefined();
    expect(leerToken()).toBeNull();
  });

  it("manda el token en la cabecera cuando hay sesion", async () => {
    guardarToken("token-abc");
    const simulado = simularFetch().mockResolvedValue(respuesta(200, {}));

    await api.yo();

    const [, opciones] = simulado.mock.calls[0] as [string, RequestInit];
    expect((opciones.headers as Record<string, string>).Authorization).toBe(
      "Bearer token-abc",
    );
  });

  it("escapa el codigo al buscar, para que un codigo con barra no rompa la ruta", async () => {
    const simulado = simularFetch().mockResolvedValue(
      respuesta(200, { codigo: "A/B", ambiguo: false, coincidencias: [] }),
    );

    await api.buscarPorCodigo("A/B 12");

    const [ruta] = simulado.mock.calls[0] as [string];
    expect(ruta).toBe("/api/envases/por-codigo/A%2FB%2012");
  });
});

describe("caida de sesion", () => {
  it("borra el token y avisa cuando el backend rechaza la sesion", async () => {
    guardarToken("token-viejo");
    const aviso = vi.fn();
    const cancelar = alPerderSesion(aviso);
    simularFetch().mockResolvedValue(
      respuesta(401, problema(401, "SESION_EXPIRADA")),
    );

    await expect(api.yo()).rejects.toBeInstanceOf(ErrorApi);

    expect(leerToken()).toBeNull();
    expect(aviso).toHaveBeenCalledTimes(1);
    cancelar();
  });

  it("no cierra la sesion por un rechazo de negocio", async () => {
    guardarToken("token-bueno");
    const aviso = vi.fn();
    const cancelar = alPerderSesion(aviso);
    simularFetch().mockResolvedValue(
      respuesta(409, problema(409, "ENVASE_EN_CONFLICTO")),
    );

    await expect(api.envase(63)).rejects.toBeInstanceOf(ErrorApi);

    expect(leerToken()).toBe("token-bueno");
    expect(aviso).not.toHaveBeenCalled();
    cancelar();
  });
});
