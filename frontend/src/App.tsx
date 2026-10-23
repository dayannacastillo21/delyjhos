import { useEffect, useState } from 'react'
import { getApiStatus } from './api'

function App() {
  const [apiMessage, setApiMessage] = useState('Conectando con la API…')

  useEffect(() => {
    if (!import.meta.env.DEV) return

    const controller = new AbortController()

    getApiStatus(controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) {
          setApiMessage(
            data.status === 'ok'
              ? `${data.service}: conexión correcta`
              : `${data.service}: estado ${data.status}`,
          )
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setApiMessage('No se pudo conectar con la API')
        }
      })

    return () => controller.abort()
  }, [])

  return (
    <main className="min-h-screen bg-rose-50 px-6 py-16 font-sans text-stone-800">
      <div className="mx-auto max-w-5xl">
        <header className="border-b border-rose-200 pb-6">
          <p className="text-3xl font-bold text-rose-800">DelyJhos</p>
          <p className="mt-2 text-stone-600">Pastelería hecha con cariño</p>
        </header>

        {import.meta.env.DEV && (
          <p
            role="status"
            className="mt-6 rounded-lg border border-rose-200 bg-white p-4 text-sm"
          >
            {apiMessage}
          </p>
        )}

        <section className="py-16">
          <p className="text-sm font-semibold uppercase tracking-widest text-rose-700">
            Tortas y detalles para celebrar
          </p>

          <h1 className="mt-4 max-w-2xl text-4xl font-bold leading-tight sm:text-6xl">
            Un toque dulce para tus momentos especiales.
          </h1>

          <p className="mt-6 max-w-xl text-lg text-stone-600">
            Tortas personalizadas, bocaditos, dulces y salados para compartir
            en cada celebración.
          </p>

          <a
            href="#especialidades"
            className="mt-8 inline-block rounded-xl bg-rose-800 px-6 py-3 font-semibold text-white hover:bg-rose-900 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-rose-800"
          >
            Conoce nuestras especialidades
          </a>
        </section>

        <section id="especialidades" className="scroll-mt-6">
          <h2 className="text-2xl font-bold">Nuestras especialidades</h2>

          <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {['Tortas personalizadas', 'Bocaditos', 'Dulces', 'Salados'].map(
              (categoria) => (
                <li
                  key={categoria}
                  className="rounded-2xl border border-rose-200 bg-white p-6 font-semibold"
                >
                  {categoria}
                </li>
              ),
            )}
          </ul>
        </section>
      </div>
    </main>
  )
}

export default App