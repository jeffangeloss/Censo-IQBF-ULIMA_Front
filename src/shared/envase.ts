/**
 * Como se nombra una botella en pantalla.
 *
 * El orden no es arbitrario: es el de utilidad para quien esta delante del
 * gabinete.
 *
 *   1. La etiqueta pegada. Identifica una botella y solo una.
 *   2. El codigo legado (IQF...). Puede apuntar a varias, pero al menos esta
 *      impreso en el frasco y se puede leer.
 *   3. El numero interno. No esta escrito en ningun sitio del laboratorio: es
 *      un numero de fila de la base y no sirve para reconocer nada.
 *
 * El tercer caso existe solo para no dejar una tarjeta sin titulo. Que llegara
 * a verse en la pantalla de niveles fue un fallo: la API no mandaba los
 * codigos y la interfaz caia directamente al numero interno.
 */

export interface Nombrable {
  id_fisico?: string | null;
  codigos?: string[] | null;
  id_envase?: number | null;
}

export function nombrarEnvase(envase: Nombrable): string {
  if (envase.id_fisico) return envase.id_fisico;

  const legado = envase.codigos?.find((codigo) => codigo && codigo.trim());
  if (legado) return legado.trim();

  return envase.id_envase ? `Envase ${envase.id_envase}` : "Sin identificar";
}

/** Verdadero cuando todavia no se le pego la etiqueta con QR. */
export function sinEtiqueta(envase: Nombrable): boolean {
  return !envase.id_fisico;
}
