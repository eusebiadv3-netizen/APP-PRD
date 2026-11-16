import { useRef } from "react";

interface Props {
  logoDataUrl: string | null;
  onChange: (dataUrl: string | null) => void;
}

export default function LogoUpload({ logoDataUrl, onChange }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFile(file: File) {
    const reader = new FileReader();
    reader.onload = () => onChange(typeof reader.result === "string" ? reader.result : null);
    reader.readAsDataURL(file);
  }

  return (
    <div className="logo-upload">
      {logoDataUrl ? (
        <img src={logoDataUrl} alt="Logo de la empresa" className="logo-preview" />
      ) : (
        <div className="logo-preview logo-preview-empty">Sin logo</div>
      )}
      <button className="btn-secondary" onClick={() => inputRef.current?.click()}>
        {logoDataUrl ? "Cambiar logo" : "Subir logo"}
      </button>
      {logoDataUrl && (
        <button className="btn-secondary" onClick={() => onChange(null)}>
          Quitar logo
        </button>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/svg+xml,image/webp"
        hidden
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
          e.target.value = "";
        }}
      />
    </div>
  );
}
