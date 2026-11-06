# Transportes Guatemala · SPA

Aplicación web de Transportes Guatemala construida con Next.js (App Router). Ofrece las pantallas de clientes, cajeros, administradores de sucursal, administración global y choferes, y un **BFF** (Backend for Frontend) en `src/app/api` que es el único que se comunica con el API Gateway.

## Tecnologías

| Componente              | Versión                                                                                                      |
| ----------------------- | ------------------------------------------------------------------------------------------------------------ |
| Node.js                 | ≥ 20.19 (recomendado 22 LTS)                                                                                 |
| Next.js                 | 15.3.9 (`output: "standalone"`)                                                                              |
| React / React DOM       | 19.1.0                                                                                                       |
| TypeScript              | 5.8.3                                                                                                        |
| zod                     | 3.24.4                                                                                                       |
| react-hook-form         | 7.56.3 (`@hookform/resolvers` 3.10.0)                                                                        |
| Tailwind CSS            | 4.1.6 (`@tailwindcss/postcss`)                                                                               |
| shadcn/ui               | estilo default, base slate, iconos lucide (`radix-ui`, `class-variance-authority`, `clsx`, `tailwind-merge`) |
| jose                    | 5.10.0                                                                                                       |
| jsPDF                   | 4.2.1                                                                                                        |
| Leaflet / react-leaflet | 1.9.4 / 5.0.0                                                                                                |
| Vitest                  | 3.2.0 (jsdom, Testing Library)                                                                               |
| Playwright              | 1.60.0 (`@axe-core/playwright` 4.11.3)                                                                       |
| ESLint / Prettier       | 9 (`eslint-config-next` 15.3.9) / 3.5.3                                                                      |

Otras: `lucide-react`, `sonner`, `next-themes` y `server-only`.

## Arquitectura

- **BFF:** el navegador solo llama a `/api/*`. Los Route Handlers usan clientes `server-only` (`src/lib/api/*`) que invocan `${GATEWAY_URL}/api/v1/<ruta>` con `cache: "no-store"` y un timeout de 15 s.
- **Cabeceras hacia el Gateway:** `Authorization: Bearer <token>`, `X-Operation-Branch-Id` (sede operativa validada) e `Idempotency-Key` en las mutaciones.
- **Validación:** toda respuesta del backend se valida con esquemas zod (`src/lib/validators`) antes de llegar a la interfaz; los errores problem+json se traducen a mensajes de usuario.
- **Sesión:** cookies `httpOnly` y `sameSite=lax` (`secure` en producción) con access token (15 min) y refresh token (7 días), con renovación automática. El rol y la sede se resuelven en el servidor.
- **Mutaciones:** exigen el mismo origen. El hook `useIdempotentCommand` conserva la llave de idempotencia en `sessionStorage` hasta obtener resultado, de modo que un reintento nunca genera un segundo cobro.
- **Mapas:** Leaflet con teselas configurables. **PDF:** jsPDF y descarga del PDF generado por Analytics.

## Estructura

```
src/
├── app/               Grupos por rol: (public), (authenticated), (customer), (cashier),
│                      (branch-admin), (system-admin), (driver); api/ es el BFF
├── components/        ui/, domain/, layout/
├── hooks/
├── lib/
│   ├── api/           Clientes del Gateway y operaciones BFF
│   ├── validators/    Esquemas zod
│   └── auth/
├── types/
└── styles/
tests/
├── unit/              Vitest
└── e2e/               Playwright
scripts/               Verificaciones con mock o contra un Gateway real
```

## Configuración

Copiar `.env.example` a `.env` (no versionado).

| Variable                                                                                                     | Uso                                                                              |
| ------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------- |
| `GATEWAY_URL`                                                                                                | URL del API Gateway, solo del lado del servidor (no usar prefijo `NEXT_PUBLIC_`) |
| `NEXT_PUBLIC_APP_URL`                                                                                        | Origen público de la aplicación                                                  |
| `NEXT_PUBLIC_MAP_TILE_URL`, `NEXT_PUBLIC_MAP_ATTRIBUTION`                                                    | Proveedor de teselas del mapa                                                    |
| `USE_MOCK`, `CI`                                                                                             | Pruebas end-to-end con datos simulados                                           |
| `LIVE_GATEWAY_TEST`, `LIVE_GATEWAY_URL`, `LIVE_FRONTEND_URL`, `LIVE_INVOICE_ID`, `LIVE_CHECK_ENDPOINTS_ONLY` | Verificaciones contra un entorno real                                            |

## Scripts

| Script                                             | Acción                               |
| -------------------------------------------------- | ------------------------------------ |
| `npm run dev`                                      | Servidor de desarrollo (puerto 3000) |
| `npm run build` / `npm run start`                  | Build y servidor de producción       |
| `npm run lint`                                     | ESLint (`next lint`)                 |
| `npm run type-check`                               | `tsc --noEmit`                       |
| `npm test` / `test:watch` / `test:coverage`        | Vitest                               |
| `npm run test:e2e` / `test:e2e:ci` / `test:e2e:ui` | Playwright                           |
| `npm run format:check` / `format:write`            | Prettier                             |

## Ejecutar y probar

```bash
cp .env.example .env      # definir GATEWAY_URL
npm ci
npm run dev
```

Verificación completa:

```bash
npm run type-check && npm run lint && npm test && npm run test:e2e
```

Playwright arranca el servidor de desarrollo por sí mismo.

## Despliegue

Se despliega en Vercel (`vercel.json`; solo la rama `main` publica). La salida `standalone` permite también empaquetarla en un contenedor Node.
