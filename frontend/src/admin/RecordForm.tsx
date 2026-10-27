import { useEffect, useState } from "react";
import { api, assetUrl } from "../api";
import type { RecordData } from "../api";
import type { Module } from "./modules";
import { statuses } from "./modules";

export default function RecordForm({
  module,
  record,
  onSave,
  onCancel,
}: {
  module: Module;
  record: RecordData | null;
  onSave: (data: Record<string, unknown>) => Promise<void>;
  onCancel: () => void;
}) {
  const [values, setValues] = useState<Record<string, unknown>>(() =>
    Object.fromEntries(
      module.fields.map((f) => [
        f.key,
        (f.type === "image-list" && Array.isArray(record?.[f.key])
          ? (record[f.key] as string[]).join("\n")
          : record?.[f.key]) ??
          f.defaultValue ??
          (["is_published", "price_confirmed", "is_available"].includes(f.key)
            ? false
            : f.key === "source_year"
              ? 2025
              : ["current_price", "quoted_price"].includes(f.key)
                ? ""
                : f.type === "checkbox"
                  ? true
                  : f.type === "number"
                    ? "0"
                    : f.options?.[0] || ""),
      ]),
    ),
  );
  const [lines, setLines] = useState<Record<string, unknown>[]>(() =>
    Array.isArray(record?.items)
      ? (record.items as Record<string, unknown>[]).map((line) => ({
          ...line,
          quantity: line.quantity ?? line.packs ?? 1,
        }))
      : [{ quantity: 1, unit_cost: 0 }],
  );
  const [options, setOptions] = useState<Record<string, RecordData[]>>({});
  const [error, setError] = useState("");
  const [snackPrices, setSnackPrices] = useState<RecordData[] | null>(null);
  useEffect(() => {
    if (module.key !== "snacks" || !record) return;
    const controller = new AbortController();
    api<{ presentations: RecordData[] }>(
      `/api/v1/admin/snacks/${record.id}/catalog`,
      { signal: controller.signal },
    )
      .then((data) => setSnackPrices(data.presentations))
      .catch((err) => {
        if (!controller.signal.aborted) setError(err.message);
      });
    return () => controller.abort();
  }, [module.key, record]);
  const [busy, setBusy] = useState(false);
  const lineResource =
    module.lines === "snack-packages"
      ? "snack-presentations"
      : module.lines === "orders"
        ? "products"
        : "ingredients";
  const lineKey =
    module.lines === "snack-packages"
      ? "presentation_id"
      : module.lines === "orders"
        ? "product_id"
        : "ingredient_id";
  useEffect(() => {
    const resources = new Set(
      module.fields.map((f) => f.resource).filter(Boolean) as string[],
    );
    if (module.lines) resources.add(lineResource);
    if (module.lines === "snack-packages") resources.add("snacks");
    Promise.all(
      [...resources].map(
        async (r) =>
          [r, await api<RecordData[]>(`/api/v1/admin/${r}?limit=200`)] as const,
      ),
    )
      .then((entries) => setOptions(Object.fromEntries(entries)))
      .catch((e) => setError(e.message));
  }, [module, lineResource]);
  const update = (key: string, value: unknown) =>
    setValues((old) => ({ ...old, [key]: value }));
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      if (module.key === "snacks" && record && snackPrices === null)
        throw new Error(
          "Espera a que se carguen los precios antes de guardar.",
        );
      const data: Record<string, unknown> = {};
      for (const f of module.fields) {
        if (module.key === "users" && record && f.key === "email") continue;
        if (module.key === "users" && !record && f.key === "is_active")
          continue;
        let value = values[f.key];
        if (f.type === "image-list")
          value = String(value || "")
            .split("\n")
            .map((x) => x.trim())
            .filter(Boolean);
        if ((f.resource || f.type === "integer") && value !== "")
          value = Number(value);
        if (
          value === "" &&
          [
            "email",
            "assigned_to",
            "quoted_price",
            "image_url",
            "current_price",
            "source_page",
            "production_product_id",
          ].includes(f.key)
        )
          value = null;
        if (module.key === "works" && f.key === "product_id" && value === "")
          value = null;
        if (module.key === "users" && record && f.key === "password" && !value)
          continue;
        data[f.key] = value;
      }
      if (module.lines)
        data.items = lines.map((l) =>
          module.lines === "snack-packages"
            ? {
                presentation_id: Number(l.presentation_id),
                packs: Number(l.quantity),
              }
            : module.lines === "orders"
              ? {
                  product_id: Number(l.product_id),
                  quantity: Number(l.quantity),
                }
              : module.lines === "recipes"
                ? {
                    ingredient_id: Number(l.ingredient_id),
                    quantity: String(l.quantity),
                  }
                : {
                    ingredient_id: Number(l.ingredient_id),
                    quantity: String(l.quantity),
                    unit_cost: String(l.unit_cost),
                  },
        );
      if (module.key === "snacks" && record && snackPrices?.length)
        data.presentations = snackPrices.map((price) => ({
          id: price.id,
          current_price: String(price.current_price ?? "").trim() || null,
          price_confirmed: Boolean(price.price_confirmed),
        }));
      if (module.key === "orders") data.request_key = crypto.randomUUID();
      await onSave(data);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="admin-form-card">
      <div className="admin-section-title">
        <h2>
          {record ? "Editar" : "Crear"} · {module.title}
        </h2>
        <button onClick={onCancel}>Cerrar ✕</button>
      </div>
      <form onSubmit={submit}>
        {module.key === "snacks" && record && (
          <fieldset className="snack-price-editor">
            <legend>Precios por presentación</legend>
            <p>
              Modifica aquí lo que cobrarás por 25, 50 y 100 unidades. Se
              guardará junto con el producto.
            </p>
            {snackPrices === null ? (
              <p role="status">Cargando precios…</p>
            ) : snackPrices.length ? (
              snackPrices.map((price) => (
                <div className="snack-price-row" key={price.id}>
                  <strong>{String(price.units)} unidades</strong>
                  <label>
                    Precio {String(price.units)} unidades (S/)
                    <input
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={String(price.current_price ?? "")}
                      onChange={(e) =>
                        setSnackPrices((rows) =>
                          rows!.map((row) =>
                            row.id === price.id
                              ? { ...row, current_price: e.target.value }
                              : row,
                          ),
                        )
                      }
                    />
                  </label>
                  <label className="price-visible">
                    <input
                      type="checkbox"
                      checked={Boolean(price.price_confirmed)}
                      onChange={(e) =>
                        setSnackPrices((rows) =>
                          rows!.map((row) =>
                            row.id === price.id
                              ? { ...row, price_confirmed: e.target.checked }
                              : row,
                          ),
                        )
                      }
                    />
                    Publicar precio de {String(price.units)} unidades
                  </label>
                </div>
              ))
            ) : (
              <p>Añade las presentaciones desde “Presentaciones y precios”.</p>
            )}
          </fieldset>
        )}

        <div className="admin-fields">
          {module.fields
            .filter(
              (f) => !(module.key === "users" && record && f.key === "email"),
            )
            .map((f) => (
              <label key={f.key}>
                {f.label}
                {f.type === "checkbox" ? (
                  <input
                    type="checkbox"
                    checked={Boolean(values[f.key])}
                    onChange={(e) => update(f.key, e.target.checked)}
                  />
                ) : f.type === "textarea" || f.type === "image-list" ? (
                  <textarea
                    aria-label={f.label}
                    rows={3}
                    value={String(values[f.key] ?? "")}
                    onChange={(e) => update(f.key, e.target.value)}
                  />
                ) : f.options || f.resource ? (
                  <select
                    aria-label={f.label}
                    required={f.required}
                    value={String(values[f.key] ?? "")}
                    onChange={(e) => update(f.key, e.target.value)}
                  >
                    {f.resource && <option value="">Selecciona…</option>}
                    {f.options?.map((v) => (
                      <option key={v} value={v}>
                        {statuses[v] || v}
                      </option>
                    ))}
                    {f.resource &&
                      options[f.resource]?.map((o) => (
                        <option key={o.id} value={o.id}>
                          #{o.id} ·{" "}
                          {String(o.name || o.title || o.customer_name || o.id)}
                        </option>
                      ))}
                  </select>
                ) : f.type === "image" || f.type === "video" ? (
                  <>
                    <input
                      placeholder={
                        f.type === "video"
                          ? "Ruta del video o carga un MP4"
                          : "Ruta de la imagen o carga una fotografía"
                      }
                      value={String(values[f.key] ?? "")}
                      onChange={(e) => update(f.key, e.target.value)}
                    />
                    {f.type === "image" && Boolean(values[f.key]) && (
                      <img
                        className="admin-image-preview"
                        src={assetUrl(String(values[f.key]))}
                        alt="Fotografía actual del producto"
                      />
                    )}
                    <input
                      type="file"
                      accept={
                        f.type === "video"
                          ? "video/mp4"
                          : "image/png,image/jpeg,image/webp"
                      }
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        try {
                          const form = new FormData();
                          form.append("file", file);
                          const result = await api<{ url: string }>(
                            f.type === "video"
                              ? "/api/v1/work-videos/upload"
                              : "/api/v1/uploads",
                            { method: "POST", body: form },
                          );
                          update(f.key, result.url);
                        } catch (err) {
                          setError((err as Error).message);
                        }
                      }}
                    />
                  </>
                ) : (
                  <input
                    aria-label={f.label}
                    type={f.type === "integer" ? "number" : f.type || "text"}
                    step={f.type === "number" ? "0.0001" : undefined}
                    min={
                      f.type === "number" || f.type === "integer"
                        ? 0
                        : undefined
                    }
                    required={
                      f.required &&
                      !(
                        module.key === "users" &&
                        record &&
                        f.key === "password"
                      )
                    }
                    minLength={f.type === "password" ? 12 : undefined}
                    value={String(values[f.key] ?? "")}
                    onChange={(e) => update(f.key, e.target.value)}
                  />
                )}
              </label>
            ))}
        </div>
        {module.lines && (
          <fieldset className="line-editor">
            <legend>
              {module.lines === "orders"
                ? "Productos"
                : module.lines === "snack-packages"
                  ? "Presentaciones y número de paquetes"
                  : "Ingredientes (usa la misma unidad del inventario)"}
            </legend>
            {lines.map((line, index) => (
              <div className="line-row" key={index}>
                <select
                  aria-label={`Artículo ${index + 1}`}
                  required
                  value={String(line[lineKey] || "")}
                  onChange={(e) =>
                    setLines(
                      lines.map((l, i) =>
                        i === index
                          ? {
                              ...l,
                              [lineKey]: e.target.value,
                            }
                          : l,
                      ),
                    )
                  }
                >
                  <option value="">Selecciona…</option>
                  {options[lineResource]?.map((p) => (
                    <option key={p.id} value={p.id}>
                      {module.lines === "snack-packages" ? (
                        `${String(options.snacks?.find((snack) => snack.id === p.snack_id)?.name || "Bocadito")} · ${p.units} unidades`
                      ) : (
                        <>
                          {String(p.name)} {p.unit ? `(${p.unit})` : ""}
                        </>
                      )}
                    </option>
                  ))}
                </select>
                <input
                  aria-label={`Cantidad ${index + 1}`}
                  type="number"
                  required
                  min={
                    ["orders", "snack-packages"].includes(module.lines || "")
                      ? 1
                      : 0.001
                  }
                  step={
                    ["orders", "snack-packages"].includes(module.lines || "")
                      ? 1
                      : 0.001
                  }
                  max={module.lines === "snack-packages" ? 100 : undefined}
                  value={String(line.quantity ?? 1)}
                  onChange={(e) =>
                    setLines(
                      lines.map((l, i) =>
                        i === index ? { ...l, quantity: e.target.value } : l,
                      ),
                    )
                  }
                />
                {module.lines === "purchases" && (
                  <input
                    aria-label={`Costo unitario ${index + 1}`}
                    type="number"
                    min="0"
                    step="0.0001"
                    required
                    value={String(line.unit_cost ?? 0)}
                    onChange={(e) =>
                      setLines(
                        lines.map((l, i) =>
                          i === index ? { ...l, unit_cost: e.target.value } : l,
                        ),
                      )
                    }
                  />
                )}
                <button
                  type="button"
                  onClick={() => setLines(lines.filter((_, i) => i !== index))}
                  aria-label={`Quitar línea ${index + 1}`}
                >
                  ✕
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() =>
                setLines([...lines, { quantity: 1, unit_cost: 0 }])
              }
            >
              + Añadir línea
            </button>
          </fieldset>
        )}
        {error && (
          <p role="alert" className="admin-error">
            {error}
          </p>
        )}
        <div className="admin-form-actions">
          <button type="button" onClick={onCancel}>
            Cancelar
          </button>
          <button
            className="admin-primary"
            disabled={busy || Boolean(module.lines && !lines.length)}
          >
            {busy ? "Guardando…" : "Guardar"}
          </button>
        </div>
      </form>
    </div>
  );
}
