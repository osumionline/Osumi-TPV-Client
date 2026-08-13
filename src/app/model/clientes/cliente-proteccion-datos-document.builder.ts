import type AppData from '@desktop-contracts/configuration/app-data.interface';
import type Cliente from '@model/clientes/cliente.model';

export default function buildClienteProteccionDatosDocument(
  appData: AppData,
  cliente: Cliente,
  provincia: string | null,
  factProvincia: string | null,
): string {
  const responsable: string =
    firstNotEmpty(appData.nombre, appData.nombreComercial) ?? 'El establecimiento';

  const fecha: string = new Intl.DateTimeFormat('es-ES', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date());

  const lugarFirma: string =
    normalizeOptionalText(appData.poblacion) ?? '____________________________';

  const datosFacturacion: string = cliente.factIgual
    ? ''
    : `
      <section class="section data-block">
        <h2>Datos de facturación</h2>

        <div class="data-grid">
          ${renderField('Nombre / Razón social', cliente.factNombreApellidos, true)}

          ${renderField('DNI / CIF', cliente.factDniCif)}

          ${renderField('Dirección', cliente.factDireccion, true)}

          ${renderField('Código postal', cliente.factCodigoPostal)}

          ${renderField('Población', cliente.factPoblacion)}

          ${renderField('Provincia', factProvincia)}

          ${renderField('Teléfono', cliente.factTelefono)}

          ${renderField('Correo electrónico', cliente.factEmail)}
        </div>
      </section>
    `;

  const responsableHtml: string = escapeHtml(responsable);

  const cifResponsable: string | null = normalizeOptionalText(appData.cif);

  const domicilioResponsable: string | null = joinNotEmpty(appData.direccion, appData.poblacion);

  const identificacionResponsable: string = [
    cifResponsable === null ? null : `, con CIF/NIF ${escapeHtml(cifResponsable)}`,
    domicilioResponsable === null ? null : ` y domicilio en ${escapeHtml(domicilioResponsable)}`,
  ]
    .filter((value: string | null): value is string => value !== null)
    .join('');

  const documentTitle: string = `Ficha de cliente e información sobre protección de datos - ${cliente.nombreApellidos}`;

  return `
<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <title>${escapeHtml(documentTitle)}</title>

  <style>
    * {
      box-sizing: border-box;
    }

    html {
      background: #eceff1;
    }

    body {
      margin: 0;
      color: #111;
      background: #eceff1;
      font-family: Arial, Helvetica, sans-serif;
    }

    .toolbar {
      position: sticky;
      z-index: 10;
      top: 0;
      display: flex;
      padding: 12px 20px;
      justify-content: flex-end;
      gap: 10px;
      background: #fff;
      border-bottom: 1px solid #ccc;
    }

    .toolbar button {
      min-width: 100px;
      padding: 9px 16px;
      border: 1px solid #555;
      border-radius: 4px;
      color: #111;
      background: #fff;
      font: inherit;
      cursor: pointer;
    }

    .toolbar button:first-child {
      color: #fff;
      background: #222;
    }

    .document {
      width: 210mm;
      min-height: 297mm;
      margin: 20px auto;
      padding: 14mm 16mm;
      background: #fff;
      box-shadow: 0 2px 12px rgb(0 0 0 / 18%);
    }

    h1 {
      margin: 0 0 10mm;
      font-size: 18pt;
      line-height: 1.2;
      text-align: center;
      text-transform: uppercase;
    }

    h2 {
      margin: 0 0 5mm;
      padding-bottom: 2mm;
      border-bottom: 1px solid #444;
      font-size: 12pt;
      line-height: 1.2;
      text-transform: uppercase;
      break-after: avoid;
    }

    h3 {
      margin: 5mm 0 2mm;
      font-size: 10.5pt;
      line-height: 1.3;
      break-after: avoid;
    }

    p {
      margin: 0 0 3mm;
      font-size: 9.5pt;
      line-height: 1.45;
      text-align: justify;
    }

    .section {
      margin-bottom: 8mm;
    }

    .data-grid {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 4mm 8mm;
    }

    .field {
      min-width: 0;
    }

    .field--full {
      grid-column: 1 / -1;
    }

    .field__label {
      display: block;
      margin-bottom: 1mm;
      color: #444;
      font-size: 8pt;
      font-weight: 700;
      text-transform: uppercase;
    }

    .field__value {
      display: block;
      min-height: 7mm;
      padding: 1mm 1mm 1.5mm;
      border-bottom: 1px solid #555;
      font-size: 10pt;
      line-height: 1.3;
      overflow-wrap: anywhere;
    }

    .legal-section {
      margin-bottom: 4mm;
    }

    .delivery-notice {
      margin-top: 7mm;
      padding: 4mm;
      border: 1px solid #555;
    }

    .signature {
      margin-top: 10mm;
      break-inside: avoid;
    }

    .signature__date {
      margin-bottom: 7mm;
      font-size: 10pt;
    }

    .signature__field {
      margin-bottom: 5mm;
    }

    .signature__label {
      display: inline-block;
      min-width: 45mm;
      font-size: 9pt;
      font-weight: 700;
    }

    .signature__value {
      display: inline-block;
      min-width: 95mm;
      padding: 0 2mm 1mm;
      border-bottom: 1px solid #555;
      font-size: 10pt;
    }

    .signature__box {
      width: 70mm;
      height: 25mm;
      margin-top: 3mm;
      border-bottom: 1px solid #555;
    }

    @page {
      size: A4;
      margin: 0;
    }

    @media print {
      html,
      body {
        background: #fff;
      }

      .toolbar {
        display: none;
      }

      .document {
        width: auto;
        min-height: auto;
        margin: 0;
        padding: 12mm 14mm;
        box-shadow: none;
      }

      .data-block,
      .delivery-notice,
      .signature {
        break-inside: avoid;
      }
    }
  </style>
</head>

<body>
  <div class="toolbar">
    <button id="print-button"
            type="button">
      Imprimir
    </button>

    <button id="close-button"
            type="button">
      Cerrar
    </button>
  </div>

  <main class="document">
    <h1>
      Ficha de cliente e información sobre protección de datos
    </h1>

    <section class="section data-block">
      <h2>Datos del responsable</h2>

      <div class="data-grid">
        ${renderField('Razón social', appData.nombre, true)}

        ${renderField('Nombre comercial', appData.nombreComercial)}

        ${renderField('CIF / NIF', appData.cif)}

        ${renderField('Dirección', appData.direccion, true)}

        ${renderField('Población', appData.poblacion)}

        ${renderField('Teléfono', appData.telefono)}

        ${renderField('Correo electrónico', appData.email)}

        ${renderField('Web', appData.web)}
      </div>
    </section>

    <section class="section data-block">
      <h2>Datos del cliente</h2>

      <div class="data-grid">
        ${renderField('Nombre y apellidos', cliente.nombreApellidos, true)}

        ${renderField('DNI / CIF', cliente.dniCif)}

        ${renderField('Dirección', cliente.direccion, true)}

        ${renderField('Código postal', cliente.codigoPostal)}

        ${renderField('Población', cliente.poblacion)}

        ${renderField('Provincia', provincia)}

        ${renderField('Teléfono', cliente.telefono)}

        ${renderField('Correo electrónico', cliente.email)}
      </div>
    </section>

    ${datosFacturacion}

    <section class="section">
      <h2>Información sobre protección de datos</h2>

      <div class="legal-section">
        <h3>Responsable del tratamiento</h3>

        <p>
          El responsable del tratamiento de los datos personales incluidos
          en esta ficha es <strong>${responsableHtml}</strong>${identificacionResponsable}.
          Puede contactar con el responsable a través de los datos de contacto
          indicados en el apartado «Datos del responsable».
        </p>
      </div>

      <div class="legal-section">
        <h3>Finalidades del tratamiento</h3>

        <p>
          Los datos serán tratados para gestionar la relación comercial con
          el cliente y su ficha de cliente, incluyendo la gestión de compras
          y su historial, reservas, devoluciones, garantías, facturación,
          atención al cliente y las comunicaciones necesarias relacionadas
          con estas operaciones.
        </p>

        <p>
          Los datos de contacto facilitados no serán utilizados por el mero
          hecho de formar parte de esta ficha para el envío de publicidad o
          comunicaciones comerciales no relacionadas con la relación mantenida
          con el cliente.
        </p>
      </div>

      <div class="legal-section">
        <h3>Legitimación</h3>

        <p>
          El tratamiento de los datos necesarios para gestionar las compras,
          servicios solicitados, atención al cliente y demás actuaciones
          derivadas de la relación comercial se basa en la ejecución de la
          relación contractual o en la aplicación de medidas solicitadas por
          el propio cliente.
        </p>

        <p>
          Los tratamientos que sean necesarios para cumplir obligaciones de
          facturación, contabilidad, tributarias u otras obligaciones legalmente
          exigibles se basan en el cumplimiento de dichas obligaciones legales.
        </p>

        <p>
          La creación de una ficha de cliente es voluntaria. La negativa a
          crearla no impide realizar una compra ordinaria, aunque puede impedir
          utilizar funcionalidades asociadas a dicha ficha, como disponer de
          un historial de operaciones o beneficiarse de condiciones particulares
          vinculadas al cliente.
        </p>
      </div>

      <div class="legal-section">
        <h3>Conservación de los datos</h3>

        <p>
          Los datos se conservarán mientras se mantenga la relación con el
          cliente y durante el tiempo necesario para atender las finalidades
          para las que fueron recogidos. Posteriormente podrán conservarse,
          debidamente bloqueados cuando corresponda, durante los plazos
          necesarios para atender las obligaciones legales y posibles
          responsabilidades derivadas de la relación mantenida.
        </p>
      </div>

      <div class="legal-section">
        <h3>Destinatarios</h3>

        <p>
          Los datos no serán comunicados a terceros salvo cuando exista una
          obligación legal o cuando resulte necesario para la prestación de
          un servicio relacionado con la relación comercial. Cuando intervengan
          proveedores que accedan a datos por cuenta del responsable, deberán
          hacerlo en calidad de encargados del tratamiento y conforme a las
          instrucciones del responsable.
        </p>

        <p>
          No se prevén transferencias internacionales de los datos derivadas
          de la utilización ordinaria de esta ficha de cliente.
        </p>
      </div>

      <div class="legal-section">
        <h3>Derechos del interesado</h3>

        <p>
          El cliente puede solicitar al responsable el acceso a sus datos
          personales, su rectificación cuando sean inexactos, su supresión
          cuando proceda, la limitación de su tratamiento, la portabilidad de
          sus datos cuando resulte aplicable y oponerse al tratamiento en los
          casos previstos legalmente.
        </p>

        <p>
          Para ejercer estos derechos puede dirigirse al responsable a través
          de cualquiera de los medios de contacto indicados al inicio de este
          documento, acreditando suficientemente su identidad.
        </p>

        <p>
          Asimismo, si considera que el tratamiento de sus datos personales
          no se ajusta a la normativa, puede presentar una reclamación ante la
          Agencia Española de Protección de Datos (AEPD).
        </p>
      </div>

      <div class="legal-section">
        <h3>Decisiones automatizadas</h3>

        <p>
          No se adoptarán decisiones con efectos jurídicos o significativamente
          similares sobre el cliente basadas exclusivamente en un tratamiento
          automatizado de los datos incluidos en esta ficha.
        </p>
      </div>
    </section>

    <section class="section delivery-notice">
      <h2>Constancia de entrega de la información</h2>

      <p>
        El interesado declara haber recibido la información anterior relativa
        al tratamiento de sus datos personales.
      </p>

      <p>
        La firma de este documento no constituye una autorización general para
        utilizar los datos con finalidades diferentes de las indicadas, ni
        autoriza por sí misma el envío de comunicaciones comerciales o
        publicitarias.
      </p>
    </section>

    <section class="signature">
      <p class="signature__date">
        En ${escapeHtml(lugarFirma)}, a ${escapeHtml(fecha)}.
      </p>

      <div class="signature__field">
        <span class="signature__label">
          Nombre del interesado:
        </span>

        <span class="signature__value">
          ${renderInlineValue(cliente.nombreApellidos)}
        </span>
      </div>

      <div class="signature__field">
        <span class="signature__label">
          DNI / CIF:
        </span>

        <span class="signature__value">
          ${renderInlineValue(cliente.dniCif)}
        </span>
      </div>

      <div>
        <span class="signature__label">
          Firma del interesado:
        </span>

        <div class="signature__box"></div>
      </div>
    </section>
  </main>
</body>
</html>
  `.trim();
}

function renderField(label: string, value: string | null, fullWidth: boolean = false): string {
  const normalizedValue: string | null = normalizeOptionalText(value);

  return `
    <div class="field${fullWidth ? ' field--full' : ''}">
      <span class="field__label">
        ${escapeHtml(label)}
      </span>

      <span class="field__value">
        ${normalizedValue === null ? '&nbsp;' : escapeHtml(normalizedValue)}
      </span>
    </div>
  `;
}

function renderInlineValue(value: string | null): string {
  const normalizedValue: string | null = normalizeOptionalText(value);

  return normalizedValue === null ? '&nbsp;' : escapeHtml(normalizedValue);
}

function normalizeOptionalText(value: string | null): string | null {
  if (value === null) {
    return null;
  }

  const normalizedValue: string = value.trim();

  return normalizedValue === '' ? null : normalizedValue;
}

function firstNotEmpty(...values: readonly string[]): string | null {
  for (const value of values) {
    const normalizedValue: string | null = normalizeOptionalText(value);

    if (normalizedValue !== null) {
      return normalizedValue;
    }
  }

  return null;
}

function joinNotEmpty(...values: readonly string[]): string | null {
  const normalizedValues: readonly string[] = values
    .map((value: string): string | null => normalizeOptionalText(value))
    .filter((value: string | null): value is string => value !== null);

  return normalizedValues.length === 0 ? null : normalizedValues.join(', ');
}

/**
 * Todos los datos de empresa y cliente proceden de almacenamiento
 * editable por el usuario. Nunca deben insertarse directamente en
 * el documento HTML sin escapar.
 */
function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}
