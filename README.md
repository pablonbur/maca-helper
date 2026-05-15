# Maca helper ✨

Maca helper es una app local para Windows para guardar frases, links, datos frecuentes e instrucciones, y copiarlos al portapapeles con un click.

La idea es simple: abrís la app, tocás un renglón, ves el aviso de copiado y pegás manualmente donde quieras usar ese texto.

> Maca helper no se conecta a servicios externos, no usa IA online, no automatiza otras apps y no pega ni envía nada por su cuenta.

---

## 🚀 Solo quiero usar la app

Si solo querés instalar Maca helper como usuario final, no necesitás programar ni instalar herramientas técnicas.

### Descargar el instalador

1. Entrá a la [última release de GitHub](https://github.com/pablonbur/maca-helper/releases/latest).
2. Bajá el instalador de Windows desde **Assets**.
   - Recomendado: `.exe`.
   - Alternativa: `.msi`.
3. Ejecutá el instalador.
4. Abrí **Maca helper**.
5. Importá tu JSON privado si tenés uno.
6. Tocá cualquier renglón para copiar.

Para usar la app no necesitás:

- Node.js
- npm
- Rust
- Cargo
- Docker
- Visual Studio Build Tools
- Clonar este repositorio

### Instalar desde repo descargado

Si descargaste o clonaste este repo y querés instalar la última versión publicada:

```powershell
.\install.cmd
```

Ese script descarga la última release desde GitHub y abre el instalador de Windows.

---

## 🧭 Cómo se usa

La pantalla principal está pensada para ser rápida y compacta:

- Arriba tenés accesos rápidos, como un dato corto, un link actual o un grupo de links.
- Abajo tenés una lista de frases en renglones.
- Click en un renglón copia el texto completo.
- `Copiar` hace lo mismo, por si preferís usar el botón.
- `Editar` abre el editor lateral.
- `Otra` aparece en frases variables y genera una variante nueva.
- El buscador filtra por título, categoría o texto.
- `Claro/Oscuro` cambia el tema visual.
- `Importar` carga un JSON propio.
- `Exportar` guarda un backup JSON.
- `Avanzado` permite editar bloques de variables.

También podés seleccionar una parte del texto con el mouse sin que se copie accidentalmente.

---

## 🎨 Diseño actual

La app usa dark mode por defecto, con una estética violeta/gris inspirada en apps tipo Discord/Codex.

La paleta principal es:

| Token | Valor |
| --- | --- |
| Fondo base | `#0F1117` |
| Surface | `#171A22` |
| Surface elevada | `#232838` |
| Texto principal | `#F5F7FF` |
| Texto secundario | `#B8C1D9` |
| Lilac chrome | `#C7A6FF` |
| Mint spectral | `#72F0DD` |
| Crimson relic | `#FF5C7A` |
| Gold parchment | `#D8B66A` |

El tema elegido se guarda localmente en la máquina.

---

## 🧩 Cómo cargar tus propias frases

Tenés tres caminos simples.

### 1. Editar desde la app

1. Abrí Maca helper.
2. Tocá `Nuevo`.
3. Cargá título, categoría y contenido.
4. Guardá.

También podés tocar `Editar` sobre un renglón existente y reemplazarlo por tus propios textos.

### 2. Importar un JSON

Si ya tenés varias frases preparadas:

1. Prepará un archivo `.json` con el formato de Maca helper.
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
4. Abrí Maca helper.
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

El archivo privado recomendado es:

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

Maca helper está pensada como una consola local de copiado.

La app:

- ✅ Copia texto al portapapeles.
- ✅ Funciona local y offline.
- ✅ Permite crear, editar, buscar e importar/exportar datos.
- ✅ Genera variantes usando bloques locales curados.
- ✅ Permite tema oscuro/claro.

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
git tag v0.1.2
git push origin v0.1.2
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

Para usar Maca helper como usuario final, sí es simple: descargás el instalador y listo.

`npm install` solo aplica si vas a desarrollar la app. Maca helper usa Tauri, y Tauri compila una aplicación nativa de Windows usando Rust y herramientas nativas del sistema. Por eso:

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
- Instalador Windows publicado en GitHub Releases.
- UI compacta de renglones copiables.
- Dark mode violeta por defecto, con toggle claro/oscuro.
- Accesos rápidos arriba.
- Búsqueda.
- Crear/editar snippets fijos.
- Regenerar plantillas variables.
- Edición avanzada de bloques.
- Importar/exportar JSON.
- Tests unitarios del generador.
