import { useEffect, useState } from "react";
import { api } from "../api";

export default function BusinessSettings() {
  const [values, setValues] = useState({
    name: "DelyJhos",
    whatsapp_number: "",
    contact_email: "",
    pickup_instructions: "",
    demo_catalog: true,
  });
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    api<Record<string, unknown>>("/api/v1/business/settings")
      .then((data) =>
        setValues({
          name: String(data.name || "DelyJhos"),
          whatsapp_number: String(data.whatsapp_number || ""),
          contact_email: String(data.contact_email || ""),
          pickup_instructions: String(data.pickup_instructions || ""),
          demo_catalog: Boolean(data.demo_catalog),
        }),
      )
      .catch((e) => setMessage(e.message));
  }, []);
  return (
    <>
      <h1>Configuración del negocio</h1>
      <section className="admin-panel">
        <p className="muted">
          Configura el contacto público. Nunca ingreses contraseñas ni
          credenciales de PostgreSQL en estos campos.
        </p>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            try {
              await api("/api/v1/business/settings", {
                method: "PUT",
                body: JSON.stringify({
                  ...values,
                  contact_email: values.contact_email || null,
                }),
              });
              setMessage(
                "Configuración guardada. Recarga la página pública para ver los cambios.",
              );
            } catch (err) {
              setMessage((err as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          <div className="admin-fields">
            <label>
              Nombre comercial
              <input
                required
                maxLength={120}
                value={values.name}
                onChange={(e) => setValues({ ...values, name: e.target.value })}
              />
            </label>
            <label>
              WhatsApp (código de país + número, solo dígitos)
              <input
                pattern="[0-9]{8,15}|^$"
                value={values.whatsapp_number}
                onChange={(e) =>
                  setValues({ ...values, whatsapp_number: e.target.value })
                }
                placeholder="Ej. 51 seguido del número"
              />
            </label>
            <label>
              Correo de contacto
              <input
                type="email"
                value={values.contact_email}
                onChange={(e) =>
                  setValues({ ...values, contact_email: e.target.value })
                }
              />
            </label>
            <label>
              Instrucciones de entrega
              <textarea
                maxLength={1000}
                value={values.pickup_instructions}
                onChange={(e) =>
                  setValues({ ...values, pickup_instructions: e.target.value })
                }
              />
            </label>
            <label>
              Catálogo con datos de muestra
              <input
                type="checkbox"
                checked={values.demo_catalog}
                onChange={(e) =>
                  setValues({ ...values, demo_catalog: e.target.checked })
                }
              />
            </label>
          </div>
          <div className="admin-form-actions">
            <button className="admin-primary" disabled={busy}>
              {busy ? "Guardando…" : "Guardar configuración"}
            </button>
          </div>
          {message && <p role="status">{message}</p>}
        </form>
      </section>
    </>
  );
}
