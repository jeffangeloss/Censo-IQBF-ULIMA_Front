import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

import { ErrorApi, ErrorDeRed, alPerderSesion, api, leerToken } from "@/api/cliente";
import type { Usuario } from "@/api/tipos";
import { Aviso, Boton, Campo, Cargando } from "@/shared/ui/componentes";

interface Contexto {
  usuario: Usuario;
  salir: () => Promise<void>;
}

const ContextoSesion = createContext<Contexto | null>(null);

export function useSesion(): Contexto {
  const contexto = useContext(ContextoSesion);
  if (!contexto) throw new Error("useSesion fuera del proveedor");
  return contexto;
}

export function ProveedorSesion({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [verificando, setVerificando] = useState(true);

  useEffect(() => {
    // Si el backend rechaza la sesion en cualquier momento, se vuelve al
    // login sin esperar a que el operador toque algo.
    return alPerderSesion(() => setUsuario(null));
  }, []);

  useEffect(() => {
    (async () => {
      if (!leerToken()) {
        setVerificando(false);
        return;
      }
      try {
        setUsuario(await api.yo());
      } catch (error) {
        // Sin red se conserva la sesion: el operador puede seguir pesando y
        // la cola se encarga de sincronizar cuando vuelva la senal.
        if (!(error instanceof ErrorDeRed)) setUsuario(null);
      } finally {
        setVerificando(false);
      }
    })();
  }, []);

  const salir = useCallback(async () => {
    await api.logout().catch(() => undefined);
    setUsuario(null);
  }, []);

  if (verificando) return <Cargando texto="Comprobando la sesion" />;
  if (!usuario) return <Login alEntrar={setUsuario} />;

  return (
    <ContextoSesion.Provider value={{ usuario, salir }}>
      {children}
    </ContextoSesion.Provider>
  );
}

function Login({ alEntrar }: { alEntrar: (usuario: Usuario) => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function enviar(evento: React.FormEvent) {
    evento.preventDefault();
    setEnviando(true);
    setError(null);
    try {
      const sesion = await api.login(email.trim(), password);
      alEntrar(sesion.usuario);
    } catch (problema) {
      if (problema instanceof ErrorDeRed) {
        setError("Sin conexion. Para iniciar sesion hace falta red.");
      } else if (problema instanceof ErrorApi) {
        setError(problema.message);
      } else {
        setError("No se pudo iniciar sesion.");
      }
    } finally {
      setEnviando(false);
    }
  }

  return (
    <main className="pantalla pantalla--centrada">
      <header className="portada">
        <p className="eyebrow">Universidad de Lima · Docimasia</p>
        <h1>Censo IQBF</h1>
      </header>

      <form className="formulario" onSubmit={enviar}>
        <Campo
          etiqueta="Correo"
          type="email"
          inputMode="email"
          autoComplete="username"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Campo
          etiqueta="Contraseña"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {error ? <Aviso tono="mal">{error}</Aviso> : null}
        <Boton type="submit" disabled={enviando}>
          {enviando ? "Entrando…" : "Entrar"}
        </Boton>
      </form>
    </main>
  );
}
