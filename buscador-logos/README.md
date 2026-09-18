# Buscador de Logos de Marcas (PNG)

Implementación del MVP descrito en el PRD "Buscador de Logos de Marcas (PNG)":
buscar el logo de una marca por nombre y descargarlo en PNG en pocos segundos.

## Cómo correrlo

Es una app estática sin build step (HTML/CSS/JS). Basta con servir la carpeta:

```bash
cd buscador-logos
python3 -m http.server 8080
# abrir http://localhost:8080
```

O abrir `index.html` directamente en el navegador.

## Cómo funciona

Cadena de resolución de logos, según la sección 8 del PRD:

1. **Base propia curada** (`data/brands.js`): nombres y alias (español/inglés) de
   marcas conocidas mapeados a su dominio oficial.
2. **Dominio inferido**: si la marca no está en la base curada, se infiere un
   dominio a partir del nombre (`marca` → `marca.com`) y se intenta igual.
3. **Clearbit Logo API** (`https://logo.clearbit.com/{dominio}`) como fuente
   principal del PNG.
4. **Favicon de Google** (`https://www.google.com/s2/favicons`) como último
   fallback, solo para marcas verificadas en la base curada — para dominios
   inferidos no se usa, porque ese servicio casi siempre responde con un ícono
   genérico aunque el dominio no exista, lo que daría falsos positivos.

Si ninguna fuente responde con una imagen válida, se muestra el estado de
"no encontrado" con sugerencias de marcas similares (por coincidencia de
prefijo y distancia de edición sobre la base curada).

## Requisitos funcionales cubiertos (MVP)

- RF-01 Búsqueda por nombre con autocompletado (`<datalist>`).
- RF-02 Vista previa antes de la descarga.
- RF-03 Descarga en un clic (via `fetch` + blob; si la fuente no permite
  descarga directa por CORS, se abre la imagen en una pestaña nueva con
  instrucciones para guardarla manualmente).
- RF-04 Manejo de "no encontrado" con sugerencias.
- RF-05 Fondo transparente cuando la fuente lo permite (se indica con un
  patrón de cuadrícula detrás del logo).
- RF-07 Fuente/origen del logo visible junto al resultado.
- RF-08 Selector de resolución de salida (256 / 512 / 1024 px).
- RF-09 Búsquedas en español e inglés (alias en la base curada).

Fuera de este MVP (quedan para Fase 2/3 según el PRD): variantes de logo
(isotipo/logotipo, claro/oscuro), historial de búsquedas, descarga en lote,
otros formatos (SVG/WebP), API pública.

## Nota legal

Los logos pertenecen a sus respectivas marcas. La herramienta no reclama
derechos sobre ellos; el uso del archivo descargado queda sujeto a las
políticas de marca de cada empresa (ver aviso en el pie de la app).
