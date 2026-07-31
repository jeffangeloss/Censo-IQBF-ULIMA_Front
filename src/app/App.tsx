/**
 * Cascaron de la PWA del censo.
 *
 * Las tres pantallas (escanear, pesar, cerrar) se implementan en el Sprint 3.
 * Este archivo existe para que el repositorio arranque, compile y despliegue
 * desde el primer dia, y para dejar fijada la estructura de carpetas.
 */

const PANTALLAS = [
  {
    paso: "1",
    titulo: "Escanear",
    detalle:
      "El QR abre la ficha correcta. Si el codigo es ambiguo, la app muestra " +
      "las coincidencias y obliga a elegir.",
  },
  {
    paso: "2",
    titulo: "Pesar",
    detalle:
      "Se teclea el peso en gramos. El semaforo aparece al instante; si sale " +
      "rojo, pide repetir la pesada o adjuntar una foto.",
  },
  {
    paso: "3",
    titulo: "Cerrar",
    detalle:
      "Ubicacion y condicion desde listas. Fecha, hora, usuario y zona se " +
      "graban solos: no hay campo que olvidar.",
  },
] as const;

export function App() {
  return (
    <main className="contenedor">
      <header>
        <p className="eyebrow">Universidad de Lima · Laboratorio de Docimasia</p>
        <h1>Censo IQBF</h1>
        <p className="resumen">
          Captura en campo del censo fisico de insumos quimicos fiscalizados.
        </p>
      </header>

      <ol className="pasos">
        {PANTALLAS.map((pantalla) => (
          <li key={pantalla.paso}>
            <span className="paso">{pantalla.paso}</span>
            <div>
              <h2>{pantalla.titulo}</h2>
              <p>{pantalla.detalle}</p>
            </div>
          </li>
        ))}
      </ol>

      <p className="nota">
        Sprint 3 pendiente. Mientras tanto el censo avanza con el archivo
        <code> Censo_IQBF_v3_TRAZABLE</code> y las etiquetas QR ya impresas.
      </p>
    </main>
  );
}
