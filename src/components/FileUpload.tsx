import { useRef, useState } from "react";
import { parseOrgFile, FileParseError } from "../lib/parseFile";
import type { ParsedRow } from "../types";

interface Props {
  onParsed: (rows: ParsedRow[]) => void;
  onBrowseSaved: () => void;
}

export default function FileUpload({ onParsed, onBrowseSaved }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    setLoading(true);
    setError(null);
    try {
      const rows = await parseOrgFile(file);
      onParsed(rows);
    } catch (e) {
      if (e instanceof FileParseError) {
        setError(e.message);
      } else {
        setError("No pude leer este archivo. Revisa que tenga el formato correcto e inténtalo de nuevo.");
      }
    } finally {
      setLoading(false);
    }
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  }

  return (
    <div className="upload-screen">
      <h1>Generador de Organigramas</h1>
      <p className="subtitle">
        Sube un archivo (Excel o CSV) con la lista de cargos de la empresa. Debe tener al menos
        una columna de <strong>Cargo</strong>. Opcionalmente puedes incluir <strong>Nombre</strong>,{" "}
        <strong>Reporta a</strong> y <strong>Estado</strong> (ocupado / vacante activa / vacante
        inactiva).
      </p>
      <div
        className="dropzone"
        onDragOver={(e) => e.preventDefault()}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
      >
        {loading ? (
          <span>Leyendo archivo...</span>
        ) : (
          <span>Arrastra tu archivo aquí o haz clic para seleccionarlo</span>
        )}
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          hidden
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
            e.target.value = "";
          }}
        />
      </div>
      {error && <div className="error-banner">{error}</div>}
      <button className="btn-secondary browse-saved-btn" onClick={onBrowseSaved}>
        Ver organigramas guardados
      </button>
    </div>
  );
}
