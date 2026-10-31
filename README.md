# Transportes · Aplicación web

SPA de Transportes basada en Next.js y React. Consume el backend mediante el API Gateway a través de rutas y clientes de servidor.

## Entorno

- Node.js y npm; versiones de Next.js, React y TypeScript definidas en `package.json`.
- Puerto local de Next.js: `3000` por defecto.
- API Gateway: `http://127.0.0.1:8080` en el entorno local.

## Instalar

```bash
npm ci
```

## Configuración

Si existe `.env.example`, copiarlo como `.env.local`:

```bash
if [ -f .env.example ]; then cp -n .env.example .env.local; fi
```

Configurar en `.env.local` la URL del Gateway para las llamadas de servidor:

```dotenv
GATEWAY_URL=http://127.0.0.1:8080
```

No publicar credenciales en variables `NEXT_PUBLIC_*`; esas variables pueden enviarse al navegador. `.env.local` se mantiene fuera de Git.

## Ejecutar

```bash
npm run dev
```

Abrir `http://localhost:3000`.

## Construcción y producción local

```bash
npm run build
npm run start
```

## Verificar

```bash
npm run type-check
npm run test
npm run test:e2e
```

Comandos adicionales disponibles en `package.json`. Los tests E2E utilizan el entorno y las integraciones configuradas; el modo con mocks se ejecuta mediante `npm run test:e2e:ci`.
