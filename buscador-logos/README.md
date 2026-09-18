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

Cadena de resolución de logos, según la sección 8 del PRD (base propia →
API externa → extracción de dominio), con Wikidata/Wikimedia Commons agregado
como fuente universal para cubrir marcas fuera de la base curada:

1. **Base propia curada** (`data/brands.js`): ~90 marcas de alto tráfico con
   alias (español/inglés) mapeadas a su dominio oficial, para resultados
   instantáneos y de alta confianza. Intenta Clearbit y, si falla, el favicon
   de Google (aceptable aquí porque el dominio ya está verificado).
2. **Wikidata + Wikimedia Commons**: si la marca no está en la base curada,
   se busca la entidad en Wikidata (`wbsearchentities`) y se lee su propiedad
   P154 ("logo image"), que apunta a un archivo en Wikimedia Commons. Esto
   cubre prácticamente cualquier empresa/marca con presencia notable en
   internet (Wikipedia/Wikidata), no solo las precargadas.
3. **Dominio inferido**: si tampoco hay resultado en Wikidata, se prueban
   variantes del nombre como dominio (`marca.com`, `marca.io`, `mi-marca.co`,
   etc.) contra Clearbit Logo API. No se usa el favicon de Google en este
   paso porque casi siempre responde con un ícono genérico aunque el dominio
   no exista, lo que daría falsos positivos.
4. **Dominio manual**: si ninguna fuente automática responde, el estado de
   "no encontrado" ofrece un campo para que el usuario ingrese directamente
   el dominio oficial de la marca (si lo conoce) y probarlo contra Clearbit /
   favicon — esto le da al usuario una salida siempre disponible en vez de
   dejarlo sin opciones.

Si ninguna fuente responde con una imagen válida, además se muestran
sugerencias de marcas similares de la base curada (por coincidencia de
prefijo y distancia de edición), útiles para errores de tipeo.

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
