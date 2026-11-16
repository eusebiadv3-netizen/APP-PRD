interface Props {
  onClose: () => void;
}

export default function HelpModal({ onClose }: Props) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-wide" onClick={(e) => e.stopPropagation()}>
        <h2>¿Cómo se usa?</h2>
        <ol className="help-steps">
          <li>
            <strong>Sube tu archivo</strong> Excel o CSV con los cargos (columnas: Cargo, Nombre,
            Reporta a, Estado, Tipo, Encargado temporal — las que no tengas se dejan en blanco).
          </li>
          <li>
            <strong>Confirma la jerarquía</strong>: revisa quién le reporta a quién antes de generar
            el organigrama.
          </li>
          <li>
            <strong>Edita lo que haga falta</strong>: haz clic en cualquier cajita para cambiarla, o
            usa "Agregar posición" para sumar un cargo nuevo.
          </li>
          <li>
            <strong>Para generar el organigrama de un área específica</strong> (por ejemplo
            "Administración" o "Presidencia"):
            <ul>
              <li>
                En <em>Vista</em>, elige "Área de: [el cargo]". Esto muestra a esa persona y a todos
                los que le reportan, sin el resto de la empresa.
              </li>
              <li>
                Si esa área es muy grande, o si el cargo elegido es la cabeza de toda la empresa (y por
                eso "su área" ya es todo el organigrama), combínalo con <em>Niveles a mostrar</em> para
                limitar cuántas líneas hacia abajo se ven (ej. "Primeras 2 líneas").
              </li>
            </ul>
          </li>
          <li>
            <strong>Usa "Vista previa"</strong> antes de descargar: te muestra exactamente cómo va a
            quedar la hoja (con logo, título, fecha y firmas) sin generar todavía el archivo.
          </li>
          <li>
            <strong>Descarga</strong> en el formato que necesites: imagen (PNG), PDF, Excel de 3
            columnas, o usa "Imprimir" para mandarlo directo a la impresora.
          </li>
          <li>
            <strong>Para compartirlo con otra persona</strong>, mándale el archivo descargado (PNG,
            PDF o Excel), no el link de esta página: lo que generas se guarda solo en este navegador,
            así que si otra persona abre el mismo link va a ver la pantalla de "subir archivo", no tu
            organigrama.
          </li>
        </ol>
        <div className="actions">
          <button className="btn-primary" onClick={onClose}>
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
}
