import { useEffect, useState } from "react";
import { api, setAccessToken } from "./api";
import type { SessionUser } from "./api";
import Dashboard from "./admin/Dashboard";
import Readiness from "./admin/Readiness";
import BusinessSettings from "./admin/BusinessSettings";
import SnackCatalog from "./SnackCatalog";
import ResourceView from "./admin/ResourceView";
import { Calendar, CostTools } from "./admin/Tools";
import { modules, management, statuses } from "./admin/modules";
import "./Admin.css";

export default function Admin() {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [section, setSection] = useState("dashboard");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [navOpen, setNavOpen] = useState(false);
  useEffect(() => {
    const expired = () => {
      setUser(null);
      setSection("dashboard");
      setError(
        "La sesión venció o cambió tu contraseña. Inicia sesión nuevamente.",
      );
    };
    window.addEventListener("delyjhos-session-expired", expired);
    return () =>
      window.removeEventListener("delyjhos-session-expired", expired);
  }, []);
  async function login(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const data = new FormData(e.currentTarget);
    try {
      const result = await api<{ access_token: string; user: SessionUser }>(
        "/api/v1/auth/login",
        {
          method: "POST",
          body: JSON.stringify({
            email: data.get("email"),
            password: data.get("password"),
          }),
        },
      );
      setAccessToken(result.access_token);
      setUser(result.user);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }
  if (!user)
    return (
      <main className="admin-login">
        <a href="#inicio" className="back-store">
          ← Volver a la pastelería
        </a>
        <section>
          <div className="login-logo logo-picture" />
          <p className="eyebrow">DELYJHOS · ADMINISTRACIÓN</p>
          <h1>Bienvenida de nuevo</h1>
          <p>Ingresa con tu cuenta para gestionar la pastelería.</p>
          <form onSubmit={login}>
            <label>
              Correo
              <input
                name="email"
                type="email"
                required
                autoComplete="username"
              />
            </label>
            <label>
              Contraseña
              <input
                name="password"
                type="password"
                required
                autoComplete="current-password"
                maxLength={128}
              />
            </label>
            {error && (
              <p className="admin-error" role="alert">
                {error}
              </p>
            )}
            <button className="admin-primary" disabled={busy}>
              {busy ? "Ingresando…" : "Iniciar sesión"}
            </button>
          </form>
          <p className="login-note">
            Acceso exclusivo para el equipo de DelyJhos.
          </p>
        </section>
      </main>
    );
  const module = modules.find((m) => m.key === section);
  return (
    <div className="admin-layout">
      <aside className={"admin-sidebar " + (navOpen ? "open" : "")}>
        <a href="#inicio" aria-label="Volver a DelyJhos">
          <span className="logo-picture" />
        </a>
        <nav aria-label="Administración">
          <button
            className={section === "dashboard" ? "selected" : ""}
            onClick={() => {
              setSection("dashboard");
              setNavOpen(false);
            }}
          >
            ⌂ <span>Inicio</span>
          </button>
          {modules
            .filter((m) => m.roles.includes(user.role))
            .map((m) => (
              <button
                key={m.key}
                aria-label={m.title}
                className={section === m.key ? "selected" : ""}
                onClick={() => {
                  setSection(m.key);
                  setNavOpen(false);
                }}
              >
                {m.icon} <span>{m.title}</span>
              </button>
            ))}
          <button
            onClick={() => {
              setSection("calendar");
              setNavOpen(false);
            }}
          >
            ▦ <span>Calendario</span>
          </button>
          {management.includes(user.role) && (
            <button
              onClick={() => {
                setSection("snack-preview");
                setNavOpen(false);
              }}
            >
              ◈ <span>Vista previa de bocaditos</span>
            </button>
          )}
          {management.includes(user.role) && (
            <button
              onClick={() => {
                setSection("reports");
                setNavOpen(false);
              }}
            >
              ▥ <span>Costos y reportes</span>
            </button>
          )}
          {management.includes(user.role) && (
            <button className={section === "readiness" ? "selected" : ""} onClick={() => { setSection("readiness"); setNavOpen(false); }}>✓ <span>Preparación del negocio</span></button>
          )}
          {management.includes(user.role) && (
            <button
              onClick={() => {
                setSection("settings");
                setNavOpen(false);
              }}
            >
              ⚙ <span>Configuración</span>
            </button>
          )}
        </nav>
        <a className="back-store" href="#inicio">
          ← Ver página pública
        </a>
      </aside>
      <div className="admin-workspace">
        <header className="admin-topbar">
          <button
            aria-label="Abrir menú administrativo"
            onClick={() => setNavOpen(!navOpen)}
          >
            ☰
          </button>
          <span>Gestión de la pastelería</span>
          <div>
            <span className="admin-avatar">{user.name.charAt(0)}</span>
            <span>
              <strong>{user.name}</strong>
              <small>{statuses[user.role] || user.role}</small>
            </span>
            <button
              onClick={async () => {
                try {
                  await api("/api/v1/auth/logout", { method: "POST" });
                } finally {
                  setAccessToken("");
                  setUser(null);
                  setSection("dashboard");
                }
              }}
            >
              Salir
            </button>
          </div>
        </header>
        <main className="admin-content">
          {section === "dashboard" ? (
            <Dashboard user={user} />
          ) : section === "readiness" && management.includes(user.role) ? (
            <Readiness onOpenSection={setSection} />
          ) : section === "settings" ? (
            <BusinessSettings />
          ) : section === "snack-preview" ? (
            <SnackCatalog preview />
          ) : section === "reports" ? (
            <CostTools />
          ) : section === "calendar" ? (
            <Calendar />
          ) : module ? (
            <ResourceView key={section} module={module} user={user} />
          ) : null}
        </main>
      </div>
    </div>
  );
}
