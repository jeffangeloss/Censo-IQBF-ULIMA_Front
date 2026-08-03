/**
 * Pruebas del cliente del Sprint 4: zonas, conflictos y evidencias.
 *
 * Lo que se protege aqui es sobre todo la subida de fotos. Es la unica peticion
 * que no va en JSON, y fijarle el Content-Type a mano —que es lo que hace el
 * resto del cliente— rompe el envio sin dar ningun error claro: el servidor
 * recibe un cuerpo multipart sin el boundary y contesta que faltan campos.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

import { ErrorApi, api, guardarToken } from "@/api/cliente";

function respuesta(status: number, cuerpo?: unknown): Response {
  return {
    status,
    ok: status >= 200 && status < 300,
    text: async () => (cuerpo === undefined ? "" : JSON.stringify(cuerpo)),
    blob: async () => new Blob([new Uint8Array([1, 2, 3])], { type: "image/jpeg" }),
  } as unknown as Response;
}

function simularFetch(): ReturnType<typeof vi.fn> {
  const simulado = vi.fn();
  globalThis.fetch = simulado as unknown as typeof fetch;
  return simulado;
}

function llamada(simulado: ReturnType<typeof vi.fn>): [string, RequestInit] {
  return simulado.mock.calls[0] as [string, RequestInit];
}

beforeEach(() => {
  vi.restoreAllMocks();
  guardarToken(null);
});

describe("subida de evidencia", () => {
  it("no fija el Content-Type: el boundary lo pone el navegador", async () => {
    const simulado = simularFetch().mockResolvedValue(
      respuesta(201, { id_evidencia: 7, ya_existia: false }),
    );

    await api.subirEvidencia(new Blob([new Uint8Array([1])], { type: "image/jpeg" }));

    const [, opciones] = llamada(simulado);
    const cabeceras = opciones.headers as Record<string, string>;
    expect(cabeceras["Content-Type"]).toBeUndefined();
    expect(opciones.body).toBeInstanceOf(FormData);
  });

  it("sigue mandando el token en la subida", async () => {
    guardarToken("token-abc");
    const simulado = simularFetch().mockResolvedValue(
      respuesta(201, { id_evidencia: 7 }),
    );

    await api.subirEvidencia(new Blob([new Uint8Array([1])], { type: "image/jpeg" }));

    const [, opciones] = llamada(simulado);
    expect((opciones.headers as Record<string, string>).Authorization).toBe(
      "Bearer token-abc",
    );
  });

  it("adjunta la descripcion solo cuando se da", async () => {
    const simulado = simularFetch().mockResolvedValue(
      respuesta(201, { id_evidencia: 7 }),
    );

    await api.subirEvidencia(
      new Blob([new Uint8Array([1])], { type: "image/jpeg" }),
      "Conflicto 4",
    );
    const con = llamada(simulado)[1].body as FormData;
    expect(con.get("descripcion")).toBe("Conflicto 4");
    expect(con.get("archivo")).toBeInstanceOf(Blob);

    simulado.mockClear();
    await api.subirEvidencia(new Blob([new Uint8Array([1])], { type: "image/jpeg" }));
    const sin = llamada(simulado)[1].body as FormData;
    expect(sin.get("descripcion")).toBeNull();
  });

  it("una peticion normal si declara JSON", async () => {
    const simulado = simularFetch().mockResolvedValue(respuesta(200, {}));

    await api.cerrarZona(3, 12);

    const [, opciones] = llamada(simulado);
    expect((opciones.headers as Record<string, string>)["Content-Type"]).toBe(
      "application/json",
    );
  });
});

describe("descarga de evidencia", () => {
  it("trae la foto con la sesion, porque un <img> no manda la cabecera", async () => {
    guardarToken("token-abc");
    const simulado = simularFetch().mockResolvedValue(respuesta(200));
    const crear = vi.fn(() => "blob:falsa");
    globalThis.URL.createObjectURL = crear as unknown as typeof URL.createObjectURL;

    const url = await api.evidenciaComoUrl(9);

    expect(url).toBe("blob:falsa");
    const [ruta, opciones] = llamada(simulado);
    expect(ruta).toBe("/api/evidencias/9");
    expect((opciones.headers as Record<string, string>).Authorization).toBe(
      "Bearer token-abc",
    );
  });

  it("avisa cuando la foto no esta disponible", async () => {
    simularFetch().mockResolvedValue(respuesta(404));

    await expect(api.evidenciaComoUrl(9)).rejects.toBeInstanceOf(ErrorApi);
  });
});

describe("zonas", () => {
  it("manda el conteo fisico y deja la observacion en null si no hay", async () => {
    const simulado = simularFetch().mockResolvedValue(respuesta(200, {}));

    await api.cerrarZona(3, 12);

    const cuerpo = JSON.parse(llamada(simulado)[1].body as string);
    expect(cuerpo).toEqual({ conteo_fisico: 12, observacion: null });
  });

  it("reabrir viaja con el motivo escrito", async () => {
    const simulado = simularFetch().mockResolvedValue(respuesta(200, {}));

    await api.reabrirZona(3, "Aparecio detras de la campana.");

    const [ruta, opciones] = llamada(simulado);
    expect(ruta).toBe("/api/zonas/3/reabrir");
    expect(JSON.parse(opciones.body as string).motivo).toBe(
      "Aparecio detras de la campana.",
    );
  });
});

describe("conflictos", () => {
  it("pide solo los que bloquean trabajo cuando se le indica", async () => {
    const simulado = simularFetch().mockResolvedValue(respuesta(200, []));

    await api.conflictos(true);

    expect(llamada(simulado)[0]).toBe("/api/conflictos?abiertos=true");
  });

  it("resolver manda id_evidencia null cuando no se adjunto foto", async () => {
    const simulado = simularFetch().mockResolvedValue(respuesta(200, {}));

    await api.resolverConflicto(4, "RESUELTO", "Se contrasto con el alta SUNAT.");

    const cuerpo = JSON.parse(llamada(simulado)[1].body as string);
    expect(cuerpo).toEqual({
      estado: "RESUELTO",
      resolucion: "Se contrasto con el alta SUNAT.",
      id_evidencia: null,
    });
  });
});
