# Product Spec - Maca helper

## Objetivo

Crear una app local de escritorio para Windows que funcione como consola de snippets para una operadora humana.

La usuaria necesita copiar textos frecuentes con minima friccion, editar datos del dia y generar variantes controladas de frases repetitivas.

## Usuario principal

Usuaria no tecnica que trabaja respondiendo chats online.

Necesita:

- Copiar rapido.
- Editar textos sin saber programar.
- Tener a mano datos editables, referencias y links.
- Usar frases con variaciones naturales.
- Reducir tareas repetitivas.

## Flujo deseado

1. Abre la app.
2. Hace click en una frase o boton fijo.
3. La app copia al portapapeles.
4. Ve "Copiado".
5. Pega manualmente en el chat.
6. Envia manualmente.

## Funciones principales

### Snippets fijos

Textos exactos que se copian sin cambios.

Ejemplos:

- Dato editable del dia
- Referencia editable
- Link editable 1
- Link editable 2
- Mensaje de bienvenida
- Mensaje de espera
- Mensaje de cierre

### Plantillas variables

Frases generadas con bloques curados.

```txt
{apertura} {estado} {habilitacion?} {cierre?} {emoji?}
```

### Favoritos

Items destacados arriba para acceso rapido.

### Busqueda

Filtro por titulo, categoria o contenido.

### Edicion

La usuaria puede editar desde la UI:

- titulo
- contenido
- categoria
- favorito
- habilitado/deshabilitado
- bloques de plantillas

### Import/export

Exportar todos los datos a JSON.

Importar JSON valido sin romper datos actuales.

## No objetivos

- No automatizar chats.
- No enviar mensajes.
- No pegar automaticamente.
- No integrarse con plataformas externas.
- No usar IA online.
- No usar backend.
- No usar login.
