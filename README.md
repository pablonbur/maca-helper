# Maca Helper

Maca Helper es una app local para Windows pensada como consola de snippets copy-only.

La app organiza, edita, genera variantes curadas y copia textos al portapapeles. La persona usuaria pega manualmente el texto donde corresponda.

## Limites importantes

Esta app:

- Copia texto al portapapeles.
- Funciona local/offline.
- No usa APIs externas.
- No usa IA en runtime.
- No tiene login.
- No tiene backend.
- No automatiza otras apps.
- No hace auto-paste.
- No hace auto-send.
- No controla ventanas externas.

## Para usuarias finales

La forma correcta de usar Maca Helper es instalar una version ya compilada desde GitHub Releases.

La usuaria final NO necesita:

- Node.js
- npm
- Rust
- Cargo
- Docker
- Visual Studio Build Tools
- Clonar el repo

Flujo recomendado:

1. Ir a GitHub Releases.
2. Descargar el instalador de Windows (`.msi` o `.exe`).
3. Instalar.
4. Abrir Maca Helper.
5. Cargar textos desde la UI o importar un JSON privado.

## Instalacion desde repo clonado

Si alguien clono el repo y quiere instalar la ultima release publicada:

```powershell
.\install.cmd
```

Ese script busca la ultima release del repo de GitHub, descarga el instalador de Windows y lo abre.

Si el script no puede detectar el repo, se puede pasar manualmente:

```powershell
$env:MACA_HELPER_REPO="usuario/maca-helper"
.\install.cmd
```

## Desarrollo con Docker

El desarrollo web/test/build del frontend esta dockerizado.

Requisitos para desarrollo:

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

## Build del instalador Windows

El instalador Windows no se genera en Docker.

Tauri compila una app nativa de Windows y necesita toolchain nativo de Windows. Por eso el build instalable vive en GitHub Actions usando `windows-latest`.

Workflow:

```txt
.github/workflows/windows-release.yml
```

Para generar una release:

```powershell
git tag v0.1.0
git push origin v0.1.0
```

GitHub Actions va a:

1. Instalar Node.
2. Instalar Rust.
3. Ejecutar `npm ci`.
4. Ejecutar tests.
5. Ejecutar build frontend.
6. Ejecutar `npm run tauri:build`.
7. Subir `.msi/.exe` como artefacto.
8. Publicar assets en la GitHub Release si el build vino de un tag.

## Por que no alcanza con `npm install`

`npm install` solo instala dependencias JavaScript.

Esta app usa Tauri. Tauri empaqueta el frontend web dentro de una app nativa liviana. Esa app nativa se compila con Rust y, en Windows, requiere herramientas nativas de Microsoft para generar el instalador.

Resumen:

- Usuaria final: descarga instalador, no necesita nada mas.
- Desarrollo web: Docker.
- Build instalador Windows: GitHub Actions en runner Windows.

## Stack

- Tauri 2
- Vite
- TypeScript
- UI en TypeScript vanilla
- Persistencia local en `localStorage` para V1
- Datos exportables/importables en JSON

## Comandos npm internos

Estos comandos se usan dentro de Docker o GitHub Actions:

```powershell
npm test
npm run build
npm run tauri:build
```

## Datos privados y GitHub

El repo no debe incluir frases reales, links privados, alias, cuentas, backups ni textos de uso personal.

Archivo publico seguro:

```txt
seed/snippets.example.json
```

Ese archivo tiene datos demo genericos y se puede subir a GitHub.

Plantilla publica para crear datos propios:

```txt
seed/snippets.local.template.json
```

Archivo privado recomendado:

```txt
seed/snippets.local.json
```

Ese archivo esta ignorado por Git.

Para usar datos privados:

1. Copiar `seed/snippets.local.template.json`.
2. Renombrar la copia a `seed/snippets.local.json`.
3. Editar `seed/snippets.local.json` con los datos reales.
4. Abrir la app.
5. Tocar `Importar`.
6. Elegir `seed/snippets.local.json`.

La app guarda esos datos localmente despues de importarlos.

## Archivos privados ignorados

El `.gitignore` ignora:

```txt
seed/snippets.local.json
seed/*.private.json
backups/
exports/
*.backup.json
*maca-helper-backup*.json
```

Antes de subir a GitHub:

```powershell
git status --short
git check-ignore -v seed/snippets.local.json
```

## Backups

Desde la app:

- `Exportar`: descarga un JSON con todos los datos.
- `Importar`: reemplaza los datos actuales si el JSON es valido.

Guardar backups fuera del repo o dentro de `backups/`, que esta ignorado.
