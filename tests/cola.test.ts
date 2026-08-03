/**
 * Pruebas de la cola offline.
 *
 * Lo que se protege aqui es una sola cosa: una pesada hecha en el sotano no se
 * pierde nunca. Ni cuando no hay senal, ni cuando el servidor contesta que no,
 * ni cuando la jornada dura mas que el token.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

import { ErrorApi, ErrorDeRed, api } from "@/api/cliente";
import type { Pesada, PesadaEntrada } from "@/api/tipos";
import { encolar, listar, nuevoUuid, sincronizar } from "@/shared/offline/cola";

function entrada(uuid: string, id_envase = 63): PesadaEntrada {
  return { client_uuid: uuid, id_envase, peso_bruto_g: "5518.4800" };
}

function registrada(uuid: string): Pesada {
  return {
    id_pesada: 1,
    client_uuid: uuid,
    id_envase: 63,
    tipo: "PRIMERA",
    peso_bruto_g: "5518.4800",
    tara_aplicada_g: "1212.3000",
    peso_neto_g: "4306.1800",
    semaforo: "OK",
    balanza: null,
    posicion: null,
    condicion: null,
    fecha_operacion: "2026-08-03",
    registrado_en: "2026-08-03T10:00:00Z",
    anula_id_pesada: null,
    observacion: null,
    ya_registrada: false,
  };
}

beforeEach(async () => {
  vi.restoreAllMocks();
  await new Promise<void>((resolver) => {
    const solicitud = indexedDB.deleteDatabase("censo-iqbf");
    solicitud.onsuccess = () => resolver();
    solicitud.onerror = () => resolver();
    solicitud.onblocked = () => resolver();
  });
});

describe("guardado local", () => {
  it("deja la pesada a salvo antes de cualquier envio", async () => {
    const uuid = nuevoUuid();
    await encolar(entrada(uuid), "IQBF-2026-0063");

    const pendientes = await listar();
    expect(pendientes).toHaveLength(1);
    expect(pendientes[0]!.client_uuid).toBe(uuid);
    expect(pendientes[0]!.cuerpo.peso_bruto_g).toBe("5518.4800");
    expect(pendientes[0]!.etiqueta).toBe("IQBF-2026-0063");
  });

  it("genera identificadores distintos para cada pesada", () => {
    const uuids = new Set(Array.from({ length: 200 }, () => nuevoUuid()));
    expect(uuids.size).toBe(200);
  });

  it("no duplica cuando se encola dos veces el mismo client_uuid", async () => {
    const uuid = nuevoUuid();
    await encolar(entrada(uuid), "IQBF-2026-0063");
    await encolar(entrada(uuid), "IQBF-2026-0063");

    expect(await listar()).toHaveLength(1);
  });
});

describe("sincronizacion", () => {
  it("borra de la cola solo lo que el servidor confirmo", async () => {
    const uuid = nuevoUuid();
    await encolar(entrada(uuid), "IQBF-2026-0063");
    const enviar = vi
      .spyOn(api, "registrarPesada")
      .mockResolvedValue(registrada(uuid));

    const resultado = await sincronizar();

    expect(enviar).toHaveBeenCalledTimes(1);
    expect(resultado).toMatchObject({ enviadas: 1, rechazadas: 0, quedan: 0 });
    expect(await listar()).toHaveLength(0);
  });

  it("conserva la pesada cuando no hay senal", async () => {
    await encolar(entrada(nuevoUuid()), "IQBF-2026-0063");
    vi.spyOn(api, "registrarPesada").mockRejectedValue(new ErrorDeRed());

    const resultado = await sincronizar();

    expect(resultado.sinRed).toBe(true);
    expect(resultado.enviadas).toBe(0);
    expect(resultado.quedan).toBe(1);
  });

  it("corta al primer fallo de red en vez de gastar la cola entera", async () => {
    await encolar(entrada(nuevoUuid()), "IQBF-2026-0063");
    await encolar(entrada(nuevoUuid()), "IQBF-2026-0064");
    const enviar = vi
      .spyOn(api, "registrarPesada")
      .mockRejectedValue(new ErrorDeRed());

    const resultado = await sincronizar();

    expect(enviar).toHaveBeenCalledTimes(1);
    expect(resultado.quedan).toBe(2);
  });
});

describe("rechazos del servidor", () => {
  it("deja visible la pesada que el servidor no acepto, en vez de borrarla", async () => {
    const uuid = nuevoUuid();
    await encolar(entrada(uuid), "IQBF-2026-0063");
    vi.spyOn(api, "registrarPesada").mockRejectedValue(
      new ErrorApi(409, "ENVASE_EN_CONFLICTO", "El envase esta en conflicto"),
    );

    const resultado = await sincronizar();

    expect(resultado.rechazadas).toBe(1);
    expect(resultado.quedan).toBe(1);
    const [pendiente] = await listar();
    expect(pendiente!.rechazo?.codigo).toBe("ENVASE_EN_CONFLICTO");
  });

  it("no vuelve a golpear al servidor con una pesada ya rechazada", async () => {
    await encolar(entrada(nuevoUuid()), "IQBF-2026-0063");
    const enviar = vi
      .spyOn(api, "registrarPesada")
      .mockRejectedValue(new ErrorApi(409, "ENVASE_EN_CONFLICTO", "no"));

    await sincronizar();
    const resultado = await sincronizar();

    expect(enviar).toHaveBeenCalledTimes(1);
    expect(resultado.rechazadas).toBe(1);
  });

  it("un token vencido no da por rechazada una pesada valida", async () => {
    await encolar(entrada(nuevoUuid()), "IQBF-2026-0063");
    vi.spyOn(api, "registrarPesada").mockRejectedValue(
      new ErrorApi(401, "SESION_EXPIRADA", "La sesion vencio"),
    );

    const resultado = await sincronizar();

    expect(resultado.rechazadas).toBe(0);
    expect(resultado.quedan).toBe(1);
    const [pendiente] = await listar();
    expect(pendiente!.rechazo).toBeUndefined();
  });

  it("un fallo del servidor deja la pesada pendiente y cuenta el intento", async () => {
    await encolar(entrada(nuevoUuid()), "IQBF-2026-0063");
    vi.spyOn(api, "registrarPesada").mockRejectedValue(
      new ErrorApi(500, "ERROR_INTERNO", "Fallo el servidor"),
    );

    const resultado = await sincronizar();

    expect(resultado.rechazadas).toBe(0);
    expect(resultado.quedan).toBe(1);
    const [pendiente] = await listar();
    expect(pendiente!.rechazo).toBeUndefined();
    expect(pendiente!.intentos).toBe(1);
  });

  it("reintenta y confirma la pesada que quedo pendiente por falta de red", async () => {
    const uuid = nuevoUuid();
    await encolar(entrada(uuid), "IQBF-2026-0063");
    const enviar = vi.spyOn(api, "registrarPesada");

    enviar.mockRejectedValueOnce(new ErrorDeRed());
    expect((await sincronizar()).quedan).toBe(1);

    enviar.mockResolvedValueOnce({ ...registrada(uuid), ya_registrada: true });
    expect((await sincronizar()).enviadas).toBe(1);
    expect(await listar()).toHaveLength(0);
  });
});
