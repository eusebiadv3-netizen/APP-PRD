const STEPS = [
  "Subir archivo\n(Excel/CSV)",
  "Confirmar\njerarquía",
  "Editar\norganigrama",
  "Elegir vista\n(completo o área)",
  "Vista previa",
  "Descargar\no imprimir",
];

export default function FlowDiagram() {
  return (
    <div className="flow-diagram">
      {STEPS.map((step, i) => (
        <div className="flow-step-group" key={step}>
          <div className="flow-step">
            <span className="flow-step-number">{i + 1}</span>
            <span className="flow-step-label">
              {step.split("\n").map((line, j) => (
                <span key={j}>
                  {line}
                  {j < step.split("\n").length - 1 && <br />}
                </span>
              ))}
            </span>
          </div>
          {i < STEPS.length - 1 && <span className="flow-arrow">→</span>}
        </div>
      ))}
    </div>
  );
}
