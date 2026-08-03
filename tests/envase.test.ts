/**
 * Como se nombra una botella en pantalla.
 *
 * El numero interno del envase no esta escrito en ninguna parte del
 * laboratorio: es un numero de fila. Que apareciera como titulo en la
 * pantalla de niveles ("Envase 50", "Envase 51") fue un fallo real, y salio
 * en la primera prueba de campo.
 */

import { describe, expect, it } from "vitest";

import { nombrarEnvase, sinEtiqueta } from "@/shared/envase";

describe("nombrar un envase", () => {
  it("manda la etiqueta pegada, que identifica una botella y solo una", () => {
    expect(
      nombrarEnvase({
        id_fisico: "IQBF-2026-0042",
        codigos: ["IQF0102-69-117"],
        id_envase: 50,
      }),
    ).toBe("IQBF-2026-0042");
  });

  it("sin etiqueta usa el codigo legado, que si esta impreso en el frasco", () => {
    expect(
      nombrarEnvase({ id_fisico: null, codigos: ["IQF0102-69-117"], id_envase: 50 }),
    ).toBe("IQF0102-69-117");
  });

  it("el numero interno es el ultimo recurso, no el primero", () => {
    expect(nombrarEnvase({ id_fisico: null, codigos: [], id_envase: 50 })).toBe(
      "Envase 50",
    );
  });

  it("no se queda sin titulo cuando no hay nada", () => {
    expect(nombrarEnvase({})).toBe("Sin identificar");
  });

  it("ignora codigos vacios en vez de mostrar una cadena en blanco", () => {
    expect(
      nombrarEnvase({ id_fisico: null, codigos: ["", "  ", "IQF0106-116-25"], id_envase: 7 }),
    ).toBe("IQF0106-116-25");
  });

  it("recorta el codigo, que en el Excel viene con espacios sueltos", () => {
    expect(nombrarEnvase({ codigos: ["  IQF0102-111-98 "] })).toBe("IQF0102-111-98");
  });

  it("tolera que la API no mande el campo", () => {
    expect(nombrarEnvase({ id_fisico: null, id_envase: 3 })).toBe("Envase 3");
  });
});

describe("saber si le falta la etiqueta", () => {
  it("distingue la botella etiquetada de la que no lo esta", () => {
    expect(sinEtiqueta({ id_fisico: "IQBF-2026-0001" })).toBe(false);
    expect(sinEtiqueta({ id_fisico: null, codigos: ["IQF0102-69-117"] })).toBe(true);
    expect(sinEtiqueta({})).toBe(true);
  });
});
