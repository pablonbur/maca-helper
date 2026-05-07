# Maca Helper ✨

Maca Helper es una app local para Windows para guardar frases, textos, links e instrucciones, y copiarlos al portapapeles con un click.

La idea es simple: abrís la app, tocás una tarjeta, ves el aviso de copiado y pegás manualmente donde quieras usar ese texto.

> Maca Helper no se conecta a servicios externos, no usa IA online, no automatiza otras apps y no pega ni envía nada por su cuenta.

---

## 🚀 Solo quiero usar la app

Si solo querés instalar Maca Helper como usuario final, no necesitás programar ni instalar herramientas técnicas.

### Opción recomendada: descargar el instalador

1. Entrá a la [última release de GitHub](https://github.com/pablonbur/maca-helper/releases/latest).
2. Bajá el instalador de Windows desde la sección **Assets**.
   - Recomendado: archivo `.exe`.
   - Alternativa: archivo `.msi`.
3. Ejecutá el instalador.
4. Abrí **Maca Helper**.
5. Hacé click en cualquier tarjeta para copiar su texto.
6. Pegá manualmente el texto donde lo necesites.

Eso es todo. Para usar la app no necesitás:

- Node.js
- npm
- Rust
- Cargo
- Docker
- Visual Studio Build Tools
- Clonar este repositorio

### Opción desde repo descargado

Si descargaste o clonaste este repo y querés instalar la última versión publicada:

```powershell
.\install.cmd
```

Ese script descarga la última release desde GitHub y abre el instalador de Windows.

---

## 🧭 Primer recorrido

Cuando abrís la app por primera vez vas a ver datos de ejemplo genéricos.

Desde ahí podés:

- **Copiar**: tocá una tarjeta o el botón `Copiar`.
- **Buscar**: usá el buscador para filtrar por título, contenido o categoría.
- **Crear**: tocá `Nuevo` para agregar un texto fijo.
- **Editar**: tocá `Editar` en una tarjeta.
- **Favoritos**: tocá `Fav` para mostrar ese item arriba.
- **Borrar**: tocá `Borrar`; la app pide confirmación.
- **Generar otra variante**: en tarjetas variables, tocá `Otra`.
- **Editar bloques**: tocá `Bloques` para cambiar las variantes usadas por las plantillas.
- **Exportar**: guardá un backup JSON con tus datos.
- **Importar**: cargá un JSON propio o un backup anterior.

---

## 🧩 Cómo cargar tus propias frases

Tenés tres caminos simples.

### 1. Editar desde la app

Es lo más fácil para empezar:

1. Abrí Maca Helper.
2. Tocá `Nuevo`.
3. Cargá título, categoría y contenido.
4. Guardá.

También podés tocar `Editar` sobre cualquier tarjeta de ejemplo y reemplazarla por tus propios textos.

### 2. Importar un JSON

Si ya tenés varias frases preparadas:

1. Prepará un archivo `.json` con el formato de Maca Helper.
2. Abrí la app.
3. Tocá `Importar`.
4. Elegí el archivo.
5. Si el JSON es válido, la app reemplaza los datos actuales por los importados.

Si el archivo está mal formado, la app muestra un error y conserva tus datos actuales.

### 3. Usar la plantilla privada del repo

Si estás trabajando desde el repositorio:

1. Copiá `seed/snippets.local.template.json`.
2. Renombrá la copia a `seed/snippets.local.json`.
3. Editá `seed/snippets.local.json` con tus frases reales.
4. Abrí Maca Helper.
5. Tocá `Importar`.
6. Elegí `seed/snippets.local.json`.

Después de importar, la app guarda esos datos localmente.

---

## 🔐 Qué JSON es cuál

Hay tres archivos importantes:

| Archivo | Se sube a GitHub | Para qué sirve |
| --- | --- | --- |
| `seed/snippets.example.json` | Sí | Seed público con ejemplos genéricos. Es lo que trae la app al iniciar limpia. |
| `seed/snippets.local.template.json` | Sí | Molde público para crear tu propio JSON privado. |
| `seed/snippets.local.json` | No | Archivo privado recomendado para frases reales. Está ignorado por Git. |

El archivo privado es este:

```txt
seed/snippets.local.json
```

Ese archivo está protegido por `.gitignore`, así que no debería aparecer en commits ni subirse a GitHub.

También están ignorados:

```txt
seed/*.private.json
backups/
exports/
*.backup.json
*maca-helper-backup*.json
```

Para verificarlo:

```powershell
git check-ignore -v seed/snippets.local.json
```

---

## 🗂️ Backups

Desde la app podés tocar `Exportar` para descargar un JSON con todos tus datos.

Ese backup puede servir para:

- Mover tus frases a otra computadora.
- Guardar una copia antes de editar mucho.
- Compartir una configuración privada sin subirla al repo.

Recomendación: guardá esos backups fuera del repositorio, o dentro de `backups/`, que ya está ignorado por Git.

---

## 🛡️ Límites de la app

Maca Helper está pensada como una consola local de copiado.

La app:

- ✅ Copia texto al portapapeles.
- ✅ Funciona local y offline.
- ✅ Permite editar, crear, borrar, buscar e importar/exportar datos.
- ✅ Genera variantes usando bloques locales curados.

La app no:

- ❌ Hace auto-paste.
- ❌ Hace auto-send.
- ❌ Controla ventanas externas.
- ❌ Automatiza navegadores ni otras apps.
- ❌ Usa APIs externas.
- ❌ Usa IA en runtime.
- ❌ Tiene login o backend.

---

## 🧑‍💻 Desarrollo

Esta sección es para quienes quieran modificar el código.

### Stack

- Tauri 2
- Vite
- TypeScript
- UI en TypeScript vanilla
- Persistencia local con `localStorage` en V1
- Import/export con JSON

### Desarrollo con Docker

Para desarrollo web, tests y build frontend, usá Docker.

Requisito:

- Docker Desktop

Levantar la app en navegador:

```powershell
docker compose up --build web
```

Abrir:

[http://127.0.0.1:1420](http://127.0.0.1:1420)

Correr tests:

```powershell
docker compose run --rm test
```

Build frontend:

```powershell
docker compose run --rm build
```

Wrappers opcionales:

```powershell
.\scripts\dev-docker.cmd
.\scripts\test-docker.cmd
```

### Comandos npm internos

Estos comandos se usan dentro de Docker o GitHub Actions:

```powershell
npm test
npm run build
npm run tauri:build
```

---

## 🏗️ Build del instalador Windows

El instalador de Windows se genera con GitHub Actions.

Workflow:

```txt
.github/workflows/windows-release.yml
```

Para publicar una nueva versión:

```powershell
git tag v0.1.0
git push origin v0.1.0
```

GitHub Actions se encarga de:

1. Instalar Node.
2. Instalar Rust.
3. Ejecutar `npm ci`.
4. Ejecutar tests.
5. Ejecutar build frontend.
6. Ejecutar `npm run tauri:build`.
7. Generar `.exe` y `.msi`.
8. Publicar los instaladores en GitHub Releases.

---

## ❓ Por qué no es solo `npm install`

Para usar Maca Helper como usuario final, sí es simple: descargás el instalador y listo.

`npm install` solo aplica si vas a desarrollar la app. Maca Helper usa Tauri, y Tauri compila una aplicación nativa de Windows usando Rust y herramientas nativas del sistema. Por eso:

- Usuario final: descarga `.exe` o `.msi`.
- Desarrollo web: Docker.
- Instalador Windows: GitHub Actions en Windows.

Así quien solo quiere usar la app no tiene que instalar Rust, Cargo, npm ni nada técnico.

---

## 📁 Estructura rápida

```txt
src/                         App frontend
src/domain/                  Tipos y generador de snippets
src/storage/                 Seed, storage local e import/export
src/ui/                      Componentes y pantallas
src-tauri/                   Configuración Tauri
seed/snippets.example.json   Datos demo públicos
seed/snippets.local.template.json
seed/snippets.local.json     Datos privados locales, ignorados por Git
docs/                        Documentación del producto
scripts/                     Scripts de instalación y desarrollo
```

---

## ✅ Estado actual

V1 funcional:

- App local/offline.
- Datos iniciales genéricos.
- Copiado con toast.
- Búsqueda.
- Favoritos.
- Crear/editar/borrar snippets fijos.
- Regenerar plantillas variables.
- Editar bloques.
- Importar/exportar JSON.
- Tests unitarios del generador.
- Release Windows con instaladores `.exe` y `.msi`.
