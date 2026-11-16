# APP-PRD — Generador de Organigramas

Aplicación web para generar organigramas interactivos a partir de un archivo de cargos. Ver [Promp-organigrama-prd.md](./Promp-organigrama-prd.md) para el PRD completo.

## Funcionalidad (MVP)

1. **Subir archivo** (Excel o CSV) con columnas `Cargo`, y opcionalmente `Nombre`, `Reporta a` y `Estado`.
2. **Confirmar jerarquía**: la app nunca asume quién reporta a quién — siempre muestra cada relación para que la confirmes o corrijas.
3. **Organigrama visual**: niveles ordenados automáticamente, líneas de reporte, cajas con estilo distinto para vacantes activas/inactivas.
4. **Editar por clic**: nombre, cargo y estado de cada caja; el diseño se reacomoda solo.
5. **Descargar como imagen (PNG)**: organigrama completo o solo el área (subárbol) de un cargo específico.

Todo corre en el navegador — no hay backend ni base de datos; el organigrama vive en la sesión de trabajo (descárgalo para conservarlo).

## Desarrollo

```bash
npm install
npm run dev       # servidor de desarrollo
npm run build     # build de producción (dist/)
```

Hay un archivo de ejemplo en `sample-data/ejemplo-cargos.csv` para probar el flujo completo.

## Formato del archivo de carga

| Columna     | Obligatoria | Valores |
|-------------|:---:|---|
| Cargo       | Sí  | Texto libre (título del puesto) |
| Nombre      | No  | Texto libre; vacío si está vacante |
| Reporta a   | No  | Nombre o cargo de otra fila (si es ambiguo o no coincide con exactamente una fila, se pide confirmar manualmente) |
| Estado      | No  | `ocupado`, `vacante activa`, `vacante inactiva` |
