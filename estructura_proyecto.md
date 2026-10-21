# Estructura y flujo base del proyecto

## 1. Propósito del documento

Este documento deja registrada la propuesta base de organización del proyecto, considerando:

- 3 microservicios backend RESTful con Spring Boot.
- 1 frontend SPA con Next.js y Shadcn.
- Organización feature-first.
- Principios SOLID aplicados de forma práctica.
- Trabajo guiado por archivos Markdown/SSOT para desarrollo con IA.
- Separación progresiva entre enunciado, modelo de datos, historias de usuario y casos de uso.

La idea no es sobrearquitecturar desde el inicio, sino dejar una base clara, escalable y fácil de seguir por humanos e IA.

---

## 2. Repositorios oficiales

```text
iam_service_api
  Microservicio de autenticación, usuarios, roles, permisos y seguridad.

conference_service_api
  Microservicio funcional del sistema de congresos.

wallet_service_api
  Microservicio de cartera digital, pagos, transacciones, comisiones y reportes financieros.

frontend-spa
  Aplicación SPA con Next.js y Shadcn para consumir los 3 microservicios.
```

Regla general:

```text
Cada microservicio debe ser autónomo.
Cada microservicio debe tener su propia base de datos.
Cada microservicio debe tener sus propios DTOs, entidades, reglas, migraciones y tests.
No compartir entidades JPA entre microservicios.
No crear librerías compartidas al inicio salvo que sea estrictamente necesario.
```

---

## 3. Flujo documental base

La documentación principal del proyecto se organizará así:

```text
docs-base/
├── enunciado.md
├── database_macro_schema.md
├── user_stories.md
└── use_cases/
    ├── admin-system/
    ├── congress-admin/
    ├── participant/
    ├── scientific-committee/
    └── attendance-manager/
```

Estos archivos serán la base para entender, diseñar y desarrollar el proyecto con IA.

---

## 4. enunciado.md

Inicialmente será una transcripción estructurada del PDF del proyecto.

Conforme avance el análisis, evolucionará hasta reflejar:

```text
- objetivo del sistema
- actores
- roles
- reglas de negocio fuertes
- aclaraciones necesarias
- decisiones tomadas
- límites por microservicio
- reportes requeridos
- restricciones técnicas
- dudas cerradas
- criterios generales de experiencia de usuario cuando aplique
```

Notas importantes:

```text
- Las aclaraciones surgirán conforme se interprete el enunciado.
- Las decisiones se tomarán cuando aparezcan dudas, vacíos, inconsistencias o deudas.
- Los límites por microservicio se definirán mejor conforme avance el modelo de datos y los casos de uso.
- La UX no necesita ser una sección extensa aquí, porque se reflejará mejor en user_stories.md y use_cases/.
```

El objetivo de `enunciado.md` es que la IA tenga una versión clara, ampliada y sin ambigüedades del proyecto.

---

## 5. database_macro_schema.md

Este archivo definirá las 3 bases de datos del backend:

```text
iam_db
conference_db
wallet_db
```

Debe incluir:

```text
- tablas
- columnas
- relaciones internas
- IDs remotos referenciales
- snapshots
- restricciones
- índices sugeridos
- auditoría si aplica
```

Regla clave:

```text
No habrá FK física entre bases de datos de distintos microservicios.
Cada microservicio mantiene su propia base de datos.
Las relaciones entre microservicios se manejan con IDs remotos, snapshots y validaciones por API.
```

Ejemplo:

```text
wallet_db.enrollment_payments.conference_id
```

puede referenciar conceptualmente a:

```text
conference_db.congresses.id
```

pero no debe existir una FK real entre ambas bases.

---

## 6. user_stories.md

Este archivo contendrá todas las historias de usuario identificadas y abstraídas desde `enunciado.md`.

Las historias se clasificarán por los roles principales:

```text
- Administrador del sistema
- Administrador de congreso
- Participante
- Comité científico
- Encargado de asistencia
```

Cada historia de usuario debe ser simple, clara y útil para análisis posterior.

Estructura sugerida:

```text
## HU-001 - Nombre breve de la historia

Rol:
Objetivo:
Beneficio:

Historia:
Como [rol], quiero [acción/necesidad], para [beneficio].

Criterios de aceptación resumidos:
- ...
- ...

Microservicios potencialmente involucrados:
- iam_service_api
- conference_service_api
- wallet_service_api

Pantallas potencialmente involucradas:
- frontend-spa: ...

Caso de uso asociado:
- use_cases/<rol>/UC-001-nombre.md
```

Importante:

```text
user_stories.md será una vista general.
No será el documento de mayor detalle.
El detalle real se trabajará en la carpeta use_cases/.
```

---

## 7. Carpeta use_cases/

Ya no se usará un único archivo `general_use_cases.md`.

En su lugar, se usará una carpeta:

```text
use_cases/
```

Cada caso de uso será un archivo Markdown independiente.

Estructura sugerida:

```text
use_cases/
├── admin-system/
│   ├── UC-001-gestionar-usuarios.md
│   ├── UC-002-gestionar-instituciones.md
│   └── UC-003-configurar-comision.md
│
├── congress-admin/
│   ├── UC-010-crear-congreso.md
│   ├── UC-011-gestionar-salones.md
│   ├── UC-012-gestionar-actividades.md
│   └── UC-013-abrir-convocatoria.md
│
├── participant/
│   ├── UC-020-registrar-cuenta.md
│   ├── UC-021-inscribirse-congreso.md
│   ├── UC-022-recargar-cartera.md
│   └── UC-023-consultar-diplomas.md
│
├── scientific-committee/
│   └── UC-030-evaluar-trabajo.md
│
└── attendance-manager/
    └── UC-040-registrar-asistencia.md
```

Cada caso de uso debe incluir:

```text
- rol
- objetivo
- beneficio
- descripción
- precondiciones
- flujo principal
- flujos alternos
- reglas de negocio aplicables
- criterios de aceptación
- microservicios involucrados
- endpoints necesarios
- pantallas involucradas
- dependencias previas
- datos requeridos
- impacto en DB
- prompts de desarrollo sugeridos por repo
```

En la sección de prompts sugeridos no se escribirá todavía el prompt final completo.

Solo se indicará qué repos participan:

```text
Prompts esperados:
- iam_service_api: sí/no
- conference_service_api: sí/no
- wallet_service_api: sí/no
- frontend-spa: sí
```

Luego, cuando se seleccione un caso de uso para desarrollo, se generarán los prompts finales por repositorio.

---

## 8. Flujo de trabajo para desarrollo con IA

El flujo general será:

```text
1. Crear y depurar enunciado.md
   ↓
2. Crear y depurar database_macro_schema.md
   ↓
3. Crear y depurar user_stories.md
   ↓
4. Crear casos de uso individuales en use_cases/
   ↓
5. Seleccionar un caso de uso
   ↓
6. Determinar microservicios involucrados
   ↓
7. Crear prompts por repo
   ↓
8. Implementar backend necesario
   ↓
9. Implementar frontend-spa al final
```

Para cada caso de uso:

```text
UC-X
├── Prompt para iam_service_api si aplica
├── Prompt para conference_service_api si aplica
├── Prompt para wallet_service_api si aplica
└── Prompt para frontend-spa siempre al final
```

Regla:

```text
Un caso de uso debe generar mínimo 2 prompts:
1 backend + 1 frontend.

Un caso de uso puede generar máximo 4 prompts:
3 microservicios + 1 frontend.
```

No todas las historias tocarán los 3 microservicios, pero toda funcionalidad visible deberá integrarse finalmente en `frontend-spa`.

---

## 9. Estructura base para cada microservicio backend

Cada microservicio mantendrá esta base:

```text
src/main/java/com/project/<service>/
├── core/
├── common/
├── integration/
└── feature/
```

### core/

Infraestructura global del microservicio:

```text
config
security
openapi
properties
```

### common/

Utilidades transversales internas:

```text
response
exception
pagination
validation
util
constant
```

### integration/

Comunicación con otros microservicios.

```text
integration/
├── port/
├── client/
└── dto/
```

Regla DIP:

```text
La lógica de negocio depende de interfaces internas ubicadas en integration/port.
La implementación concreta de comunicación HTTP vive en integration/client.
```

Ejemplo:

```text
conference_service_api necesita validar usuarios.
Entonces depende de UserLookupPort.
No depende directamente de WebClient, Feign o RestClient en la lógica de negocio.
```

### feature/

Contiene los módulos reales del negocio.

Cada feature crea solo las carpetas que necesita.

Regla:

```text
No crear mapper, specification, repository/impl, validator, export o report si todavía no aplica.
```

---

## 10. Niveles de estructura por feature

### Nivel 1: Feature simple

Para CRUDs simples.

```text
<feature>/
├── controller/
├── service/
├── mapper/
├── model/dto/request/
├── model/dto/response/
└── persistence/
    ├── entity/
    └── repository/
```

Aplicable a:

```text
roles
permisos
catálogos simples
instituciones si no tienen lógica compleja inicial
```

---

### Nivel 2: Feature media

Para funcionalidades con reglas, filtros, validaciones o relaciones relevantes.

```text
<feature>/
├── controller/
├── service/
├── mapper/
├── model/dto/request/
├── model/dto/response/
├── model/dto/internal/
├── persistence/
│   ├── entity/
│   ├── repository/
│   ├── specification/
│   └── query/
├── validator/
└── constant/
```

Aplicable a:

```text
usuarios
congresos
actividades
salones con restricciones
reservas
asistencias
pagos
recargas
transacciones
```

---

### Nivel 3: Feature de reportes o agregados

Para reportes tabulares, filtros, agrupaciones y exportación HTML.

```text
<feature>/
├── controller/
├── service/
├── model/dto/request/
├── model/dto/response/
├── persistence/
│   ├── repository/
│   └── repository/impl/
└── export/
```

Notas:

```text
- El enunciado pide reportes en tablas, con filtros y exportación HTML.
- No se parte inicialmente de PDF/Jasper.
- Por eso se prefiere export/ sobre report/builder/ para esta fase.
```

---

## 11. iam_service_api

Responsabilidad:

```text
Autenticación, usuarios, roles, permisos, activación/desactivación de usuarios
y validaciones de identidad para otros microservicios.
```

Estructura sugerida:

```text
feature/
├── auth/
├── user/
├── role/
└── permission/
```

Clasificación:

```text
auth        -> feature media
user        -> feature media
role        -> feature simple
permission  -> feature simple
```

Reglas clave:

```text
- Los usuarios no se eliminan, se desactivan.
- Siempre debe existir al menos un administrador del sistema activo.
- Los administradores de congreso deben ser creados por administradores del sistema.
- Este servicio emite y valida JWT.
- Los demás servicios no deben gestionar usuarios directamente.
- Otros servicios consultan IAM mediante ports.
```

---

## 12. conference_service_api

Responsabilidad:

```text
Gestión funcional del sistema de congresos:
instituciones, congresos, salones, actividades, convocatorias, trabajos,
comité científico, participantes, reservas, asistencias, diplomas y reportes operativos.
```

Estructura sugerida:

```text
feature/
├── institution/
├── congress/
├── room/
├── activity/
├── callForPaper/
├── submission/
├── scientificCommittee/
├── participant/
├── invitedSpeaker/
├── workshopReservation/
├── attendance/
├── certificate/
└── report/
```

Notas:

```text
- participant representa la participación dentro del sistema de congresos.
- La cuenta global del usuario vive en iam_service_api.
- invitedSpeaker puede mantenerse como feature separada o integrarse dentro de participant.
- Esta decisión debe quedar cerrada en enunciado.md.
```

Reglas clave:

```text
- Un congreso pertenece a una institución.
- Solo administradores enlazados a una institución pueden registrar congresos.
- Todos los congresos deben tener precio mínimo de Q35.00.
- Un salón solo puede eliminarse si no tiene actividades asociadas.
- Una actividad no puede iniciar después de finalizar.
- No puede haber dos actividades simultáneas en el mismo salón.
- El tipo de actividad no debe modificarse después de creada.
- Taller requiere cupo limitado.
- Taller requiere reserva previa para registrar asistencia.
- Asistencias son inalterables: no update, no delete.
- Diploma de asistencia requiere al menos 3 asistencias a actividades del congreso.
- Ponentes, talleristas y ponentes invitados pueden recibir diplomas por actividad.
```

---

## 13. wallet_service_api

Responsabilidad:

```text
Cartera digital, recargas manuales, pagos de inscripción, transacciones,
comisión de plataforma y reportes financieros.
```

Estructura sugerida:

```text
feature/
├── wallet/
├── topUp/
├── enrollmentPayment/
├── transaction/
├── commission/
└── report/
```

Reglas clave:

```text
- Usar BigDecimal para todo monto.
- No usar double ni float para dinero.
- La cartera es recargada manualmente por el usuario.
- El usuario debe registrar fecha de pago cuando aplique.
- Toda operación de pago debe generar transacción trazable.
- El pago de inscripción descuenta saldo de cartera.
- El sistema calcula comisión y ganancia.
- No confiar en datos de usuario o congreso enviados por frontend.
- Validar datos necesarios con IAM y Conference mediante ports.
```

---

## 14. frontend-spa

Frontend único con Next.js y Shadcn.

Estructura recomendada:

```text
frontend-spa/
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   ├── (dashboard)/
│   │   ├── layout.tsx
│   │   └── page.tsx
│   │
│   ├── features/
│   │   ├── auth/
│   │   ├── users/
│   │   ├── congresses/
│   │   ├── activities/
│   │   ├── wallet/
│   │   ├── payments/
│   │   ├── certificates/
│   │   └── reports/
│   │
│   ├── components/
│   │   ├── ui/
│   │   ├── layout/
│   │   └── common/
│   │
│   ├── lib/
│   │   ├── api/
│   │   ├── auth/
│   │   ├── utils/
│   │   └── validations/
│   │
│   ├── hooks/
│   ├── types/
│   └── config/
│
└── SSOT/
```

Por feature:

```text
features/<feature>/
├── components/
├── services/
├── schemas/
├── types/
├── hooks/
├── constants/
└── utils/
```

Si se usan Server Actions:

```text
features/<feature>/actions/
```

pero no será obligatorio desde el inicio.

Reglas clave:

```text
- La SPA consume los 3 microservicios.
- Toda funcionalidad visible termina integrándose en frontend-spa.
- components/ui corresponde a Shadcn.
- services maneja consumo HTTP.
- schemas puede usar validaciones de formularios.
- features agrupa lógica visual por dominio.
- No duplicar componentes si pueden estar en components/common.
```

---

## 15. Cómo se reflejan los principios SOLID

### SRP

Cada carpeta tiene una responsabilidad clara:

```text
controller -> frontera HTTP
service    -> casos de uso y reglas de negocio
mapper     -> conversión entre entidades y DTOs
repository -> persistencia
validator  -> validaciones específicas
DTOs       -> contratos de entrada/salida
client     -> comunicación externa
port       -> abstracción para comunicación externa
```

### OCP

El proyecto queda abierto a extensión sin modificar piezas existentes de forma innecesaria.

Ejemplos:

```text
- nuevos filtros mediante specifications
- nuevos reportes mediante export/
- nuevas integraciones mediante ports/adapters
- nuevas reglas mediante validators
- nuevos contratos mediante DTOs específicos
```

### LSP

Evitar herencia artificial.

Usar herencia solo cuando sea técnica y clara:

```text
- auditoría base
- interfaces de Spring
- clases comunes realmente reutilizables
```

Preferir composición antes que herencia.

### ISP

Interfaces pequeñas y orientadas al consumidor.

Ejemplo correcto:

```text
UserLookupPort
```

No debe obligar a depender de:

```text
crear usuario
editar usuario
eliminar usuario
asignar roles
resetear contraseña
```

si el consumidor solo necesita consultar o validar usuario.

### DIP

La lógica de negocio no depende de clientes concretos.

Depende de:

```text
integration/port
```

Las implementaciones viven en:

```text
integration/client
```

Esto permite que el service use abstracciones y que la infraestructura pueda cambiar sin romper la lógica.

---

## 16. Prácticas técnicas a usar

Backend:

```text
- Spring Boot.
- APIs RESTful.
- OpenAPI/Swagger para documentación.
- TDD en backend.
- Cobertura objetivo de 85%.
- JUnit y Mockito.
- Testcontainers si el tiempo lo permite.
- MapStruct para mappers.
- Lombok para reducir boilerplate.
- DTOs como clases normales; no records para mantener consistencia con validaciones/mappers.
- BigDecimal para dinero.
- LocalDate y LocalDateTime para fechas.
- Flyway para migraciones.
- ApiResponse para respuestas JSON.
- PageResponse para paginación.
- GlobalExceptionHandler para errores.
- Ambientes DEV y PROD.
```

Frontend:

```text
- Next.js.
- Shadcn.
- SPA.
- Validaciones de formularios.
- Consumo HTTP centralizado.
- Pruebas E2E con objetivo del 35%.
- UI fácil de usar y cómoda para el usuario.
```

MapStruct:

```java
@Mapper
public interface ExampleMapper {
    ExampleMapper INSTANCE = Mappers.getMapper(ExampleMapper.class);
}
```

Regla:

```text
No meter reglas de negocio dentro del mapper.
```

Sobre instanceof:

```text
Evitar instanceof como base de reglas de negocio.
Si aparece mucho instanceof, probablemente falta Strategy, polimorfismo,
enum con comportamiento o separación de services.
```

Validaciones:

```text
Validaciones simples:
  Bean Validation en request DTO.

Validaciones de negocio:
  service o validator de feature.

Validaciones entre microservicios:
  ports/adapters.
```

Fechas:

```text
Toda fecha manual enviada por el usuario debe conservarse semánticamente.
No reemplazarla por createdAt salvo que sea auditoría.
```

Reportes:

```text
Reportes como tablas filtrables y exportables a HTML.
Si el reporte crece, crear export/ dentro de la feature o módulo correspondiente.
```

---

## 17. SSOT por repositorio

Cada repo debe tener carpeta:

```text
SSOT/
```

Archivos sugeridos por repo:

```text
SSOT/SERVICE_CONTEXT.md
SSOT/API_CONTRACT.md
SSOT/DB_MODEL.md
SSOT/TESTING_STRATEGY.md
SSOT/AGENTS.md
```

### SERVICE_CONTEXT.md

Explica:

```text
- objetivo del microservicio o app
- límites
- responsabilidades
- entidades principales
- relación con otros servicios
```

### API_CONTRACT.md

Explica:

```text
- endpoints
- métodos HTTP
- request params
- request bodies
- response DTOs
- errores esperados
- roles autorizados
```

### DB_MODEL.md

Explica:

```text
- tablas del microservicio
- columnas
- relaciones internas
- restricciones
- índices
- migraciones esperadas
```

### TESTING_STRATEGY.md

Explica:

```text
- pruebas unitarias
- pruebas de integración
- pruebas E2E si aplica
- cobertura esperada
- casos mínimos por feature
```

### AGENTS.md

Explica:

```text
- qué archivos debe leer la IA antes de trabajar
- reglas de alcance
- gates de revisión
- convenciones de código
- criterios de no duplicación
- forma de reportar cambios
```

Regla para IA:

```text
La IA no debe implementar desde memoria.
Debe leer SSOT, inspeccionar código real, respetar alcance,
crear código mínimo correcto y reportar archivos modificados.
```

---

## 18. Criterio final de arquitectura

La estructura queda aprobada con ajuste por niveles.

Regla máxima:

```text
Feature-first dentro de cada microservicio.
Controller delgado.
Service con reglas de negocio.
Repository para persistencia.
DTOs como frontera.
Mappers separados.
Ports para comunicación entre microservicios.
Tests desde el inicio.
Frontend siempre al final de cada caso de uso.
```

La estructura completa es una plantilla máxima.

No debe crearse completa por defecto en cada feature.

Regla final:

```text
Crear solo lo necesario.
Escalar la estructura cuando la feature lo justifique.
Mantener claridad para humanos e IA.
```
