// Por esto (asegúrate de que los nombres coincidan exactamente):
import { getDatos, guardarDatos } from './storage.js';
import { calcularHorasEntreFichajes, decimalAHora, parsearFechaAString } from './calculos.js';

// --- Estado Global ---
let cacheDatos = getDatos();
let fechaActual = new Date();
let mes = fechaActual.getMonth();
let año = fechaActual.getFullYear();
let fechaSeleccionadaGlobal = null;
const UI = {};
const nombresMes = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

// --- Inicialización ---
document.addEventListener("DOMContentLoaded", () => {
  const ids = [
    "calendar",
    "mesActual",
    "formulario",
    "fechaSeleccionada",
    "tipo",
    "notas",
    "manualEntrada",
    "manualSalida",
    "manualConduccion",
    "manualOtrosTrabajos",
    "listaTurnos",
    "resumen",
    "contenedorTurnosExtra",
  ];
  ids.forEach((id) => (UI[id] = document.getElementById(id)));

  // Exponer al window para los onclick="" del HTML
  window.cerrar = () => UI.formulario.classList.add("hidden");
  window.guardarTipo = guardarTipo;
  window.exportarBackup = exportarBackup;
  window.importarBackup = importarBackup;
  window.ficharEntrada = ficharEntrada;
  window.ficharSalida = ficharSalida;
  window.aplicarHorarioManual = aplicarHorarioManual;
  window.aplicarUrbanoAutomatico = aplicarUrbanoAutomatico;
  window.eliminarDia = eliminarDia;
  window.agregarFilaExtra = agregarFilaExtra;
  window.mesAnterior = () => {
    mes--;
    if (mes < 0) {
      mes = 11;
      año--;
    }
    generarCalendario();
  };
  window.mesSiguiente = () => {
    mes++;
    if (mes > 11) {
      mes = 0;
      año++;
    }
    generarCalendario();
  };

  generarCalendario();
  mostrarResumen();
});

// --- Funciones de Lógica ---
function abrirFormulario(fecha) {
  fechaSeleccionadaGlobal = fecha;
  const [y, m, d] = fecha.split("-");
  UI.fechaSeleccionada.innerText = `${d}/${m}/${y}`;
  const datos = cacheDatos[fecha] || {};
  
  UI.tipo.value = datos.tipo || "viajes";
  UI.notas.value = datos.nota || "";
  UI.manualEntrada.value = datos.entrada || "06:00";
  UI.manualSalida.value = datos.salida || "19:30";

  // --- ARREGLO DE LOS NUEVOS INPUTS ---
  // Convertimos el decimal (ej: 4.5) a horas y minutos (ej: 04 y 30)
  const setHorasMinutos = (idH, idM, valorDecimal) => {
    let horas = Math.floor(valorDecimal || 0);
    let minutos = Math.round(((valorDecimal || 0) % 1) * 60);
    document.getElementById(idH).value = horas.toString().padStart(2, '0');
    document.getElementById(idM).value = minutos.toString().padStart(2, '0');
  };

  setHorasMinutos('condH', 'condM', datos.horasConduccion);
  setHorasMinutos('otrosH', 'otrosM', datos.horasOtrosTrabajos);
  // ------------------------------------

  UI.contenedorTurnosExtra.innerHTML = "";
  (datos.turnosExtra || []).forEach((t) => agregarFilaExtra(t.ent, t.sal));
  actualizarPanelTurnosSuperior(datos);
  UI.formulario.classList.remove("hidden");
}

function agregarFilaExtra(ent = "", sal = "") {
  if (!UI.contenedorTurnosExtra) return;

  const div = document.createElement("div");
  div.className = "turno-extra";
  div.style.cssText = "display: flex; align-items: center; gap: 8px; background: #1e293b; padding: 12px; border-radius: 8px; margin-bottom: 10px;";

  div.innerHTML = `
    <input type="time" class="extra-ent" value="${ent}" 
           style="flex: 1; padding: 10px; border-radius: 6px; border: none; background: #0f172a; color: white; font-size: 16px;">
    <span>a</span>
    <input type="time" class="extra-sal" value="${sal}" 
           style="flex: 1; padding: 10px; border-radius: 6px; border: none; background: #0f172a; color: white; font-size: 16px;">
    <button onclick="this.parentElement.remove()" 
            style="padding: 10px 15px; background: #ef4444; color: white; border: none; border-radius: 6px; font-weight: bold;">
      X
    </button>
  `;

  UI.contenedorTurnosExtra.appendChild(div);
}
function generarCalendario() {
  UI.calendar.innerHTML = "";
  UI.mesActual.innerText = `${nombresMes[mes]} ${año}`;
  
  // Usamos un DocumentFragment para mayor rendimiento
  const fragment = document.createDocumentFragment();
  
  let diasMes = new Date(año, mes + 1, 0).getDate();
  let primerDia = new Date(año, mes, 1).getDay() || 7;

  for (let i = 1; i < primerDia; i++) 
    fragment.appendChild(document.createElement("div"));

  for (let i = 1; i <= diasMes; i++) {
    let fecha = `${año}-${String(mes + 1).padStart(2, "0")}-${String(i).padStart(2, "0")}`;
    let datos = cacheDatos[fecha] || {};
    
    let div = document.createElement("div");
    
    // --- LÓGICA DE CLASES SEGURA ---
    // Si el tipo es 'urbano', 'viajes', etc., se asigna. 
    // Si no existe, dejamos 'day' a secas.
    let claseBase = "day";
    let claseTipo = datos.tipo ? datos.tipo : ""; 
    div.className = claseBase + (claseTipo ? " " + claseTipo : "");
    
    div.onclick = () => abrirFormulario(fecha);
    
    // Renderizado del contenido
    div.innerHTML = `<span class="num-dia">${i}</span>${datos.tipo ? `<span class="info-turno">${datos.tipo.charAt(0).toUpperCase()} (${(datos.amplitud || 0).toFixed(1)}h)</span>` : ""}`;
    
    fragment.appendChild(div);
  }
  
  UI.calendar.appendChild(fragment);
}

function mostrarResumen() {
  if (!UI.resumen) return;

  let totalConduccionMes = 0;
  let totalOtrosTrabajosMes = 0;
  let viajesRegistrados = 0;
  let festivosTrabajados = 0;
  let vacaciones = 0;
  let normal = 0;
  let urbano = 0;

  for (let f in cacheDatos) {
    let parts = f.split("-");
    if (parseInt(parts[0]) === año && parseInt(parts[1]) === mes + 1) {
      let d = cacheDatos[f];

      // Sumamos los valores del objeto guardado
      totalConduccionMes += parseFloat(d.horasConduccion) || 0;
      totalOtrosTrabajosMes += parseFloat(d.horasOtrosTrabajos) || 0;

      if (d.tipo === "viajes") viajesRegistrados++;
      else if (d.tipo === "festivo-trabajado") festivosTrabajados++;
      else if (d.tipo === "vacaciones") vacaciones++;
      else if (d.tipo === "normal") normal++;
      else if (d.tipo === "urbano") urbano++;
    }
  }

  let totalHorasTrabajadasMes = totalConduccionMes + totalOtrosTrabajosMes;

  // --- ALGORITMO BISEMANAL MÓVIL ---
  let maxBisemanalDetectado = 0;
  let objetoFechaBase = new Date(año, mes, 15);

  for (let desplazamiento = -20; desplazamiento <= 20; desplazamiento++) {
    let testFecha = new Date(objetoFechaBase);
    testFecha.setDate(testFecha.getDate() + desplazamiento);

    let acumulado14Dias = 0;
    for (let j = 0; j < 14; j++) {
      let loopFecha = new Date(testFecha);
      loopFecha.setDate(loopFecha.getDate() + j);
      let strF = parsearFechaAString(loopFecha);
      if (cacheDatos[strF]) {
        acumulado14Dias += parseFloat(cacheDatos[strF].horasConduccion) || 0;
      }
    }
    if (acumulado14Dias > maxBisemanalDetectado)
      maxBisemanalDetectado = acumulado14Dias;
  }

  // --- ALGORITMO DE AMPLIACIONES SEMANALES ---
  let ampliacionesEstaSemana = 0;
  let hoy = new Date();
  let diaSemanaHoy = hoy.getDay();
  if (diaSemanaHoy === 0) diaSemanaHoy = 7;
  let lunesSemana = new Date(hoy);
  lunesSemana.setDate(hoy.getDate() - (diaSemanaHoy - 1));

  for (let k = 0; k < 7; k++) {
    let loopDia = new Date(lunesSemana);
    loopDia.setDate(lunesSemana.getDate() + k);
    let stringDiaSem = parsearFechaAString(loopDia);
    if (cacheDatos[stringDiaSem]) {
      let condDia = parseFloat(cacheDatos[stringDiaSem].horasConduccion) || 0;
      if (condDia > 9.0) ampliacionesEstaSemana++;
    }
  }

  // --- RENDERIZACIÓN DE ALERTAS ---
  let tarjetaAlertas = "";

  // 1. Alerta Bisemanal
  if (maxBisemanalDetectado > 90) {
    tarjetaAlertas += `<div style="background: rgba(239, 68, 68, 0.2); border: 1px solid #ef4444; color: #fca5a5; padding: 12px; border-radius: 10px; font-size: 0.9em; margin-bottom: 10px;">🚨 <b>¡Exceso Bisemanal!</b> Llevas <b>${maxBisemanalDetectado.toFixed(1)}h</b> de conducción.</div>`;
  } else {
    let margenQ = 90 - maxBisemanalDetectado;
    tarjetaAlertas += `<div style="background: rgba(16, 185, 129, 0.15); border: 1px solid #10b981; color: #a7f3d0; padding: 12px; border-radius: 10px; font-size: 0.9em; margin-bottom: 10px;">📅 <b>Control Quincenal:</b> Margen de <b>${margenQ.toFixed(1)}h</b>.</div>`;
  }

  // 2. Alerta Ampliaciones
  if (ampliacionesEstaSemana >= 2) {
    tarjetaAlertas += `<div style="background: rgba(245, 158, 11, 0.2); border: 1px solid #f59e0b; color: #fde68a; padding: 12px; border-radius: 10px; font-size: 0.9em; margin-bottom: 10px;">⚠️ <b>Ampliaciones Agotadas.</b></div>`;
  } else {
    tarjetaAlertas += `<div style="background: rgba(56, 189, 248, 0.15); border: 1px solid #38bdf8; color: #bae6fd; padding: 12px; border-radius: 10px; font-size: 0.9em; margin-bottom: 10px;">🧵 <b>Ampliaciones:</b> Te quedan <b>${2 - ampliacionesEstaSemana}</b>.</div>`;
  }

  // --- AUDITORÍA DE SEGURIDAD (NORMATIVA 6 DÍAS) ---
  let rachaMaxima = 0;
  let rachaActual = 0;
  let fechaAnterior = null;

  let fechasOrdenadas = Object.keys(cacheDatos).sort();

  for (let f of fechasOrdenadas) {
    let dia = cacheDatos[f];
    let fechaActual = new Date(f);
    fechaActual.setHours(0, 0, 0, 0);

    // Tipos que rompen la racha
    const esDescanso = ["vacaciones", "festivo", "descanso"].includes(dia.tipo);

    if (dia && !esDescanso) {
      if (fechaAnterior !== null) {
        let difDias = (fechaActual - fechaAnterior) / (1000 * 60 * 60 * 24);
        if (difDias > 1) rachaActual = 0; // Se resetea si hay salto
      }
      rachaActual++;
      fechaAnterior = fechaActual;
      if (rachaActual > rachaMaxima) rachaMaxima = rachaActual;
    } else {
      rachaActual = 0;
      fechaAnterior = null;
    }
  }

  // --- INTEGRACIÓN DE LA ALERTA ---
  // FORZAMOS la alerta si la racha histórica máxima es >= 6
  if (rachaMaxima >= 7) {
    tarjetaAlertas += `
        <div style="background: rgba(239, 68, 68, 0.2); border: 1px solid #ef4444; color: #fca5a5; padding: 12px; border-radius: 10px; font-size: 0.9em; margin-bottom: 10px;">
            🛑 <b>¡Aviso Normativa!</b> Has detectado un bloque de trabajo de <b>${rachaMaxima} días</b>. Revisa tu descanso semanal obligatorio.
        </div>
    `;
  }

// --- RENDERIZACIÓN FINAL ---
  
  // 1. Primero, construimos el HTML del panel de resumen (los datos)
  const resumenHTML = `
        <div style="background: #1e293b; color: white; padding: 15px; border-radius: 12px; margin-top: 15px; box-shadow: 0 4px 6px rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.05);">
            <h3 style="margin-top: 0; color: #38bdf8; font-size: 1.1em;">📊 Resumen de ${nombresMes[mes]} ${año}</h3>
            <div style="margin: 8px 0;">🧵 Conducción: <b>${decimalAHora(totalConduccionMes)}</b></div>
            <div style="margin: 8px 0;">⚒️ Otros Trabajos: <b>${decimalAHora(totalOtrosTrabajosMes)}</b></div>
            <div style="margin: 8px 0; color: #4ade80;">💼 TOTAL: <b>${decimalAHora(totalHorasTrabajadasMes)}</b></div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin: 12px 0; font-size: 0.85em;">
                <div>✈️ Viajes: <b>${viajesRegistrados}</b></div>
                <div>🏢 Urbanos: <b>${urbano}</b></div>
                <div>🎉 Festivos: <b>${festivosTrabajados}</b></div>
                <div>🏖️ Vacaciones: <b>${vacaciones}</b></div>
            </div>
            ${tarjetaAlertas}
        </div>
    `;

  // 2. Buscamos el bloque de botones que ya existe en tu HTML
  const bloqueBotones = UI.resumen.querySelector('.resumen-acciones');
  
  // 3. Limpiamos el contenedor pero VOLVEMOS A AÑADIR los botones si existen
  UI.resumen.innerHTML = resumenHTML;
  if (bloqueBotones) {
      UI.resumen.appendChild(bloqueBotones);
  }
  // 3. AHORA añadimos nuestro botón de exportar de forma limpia
  const btnExportar = document.createElement("button");
  btnExportar.innerText = "📊 Descargar Histórico en Excel";
  btnExportar.style.cssText = "width: 100%; margin-top: 15px; padding: 12px; background: #8b5cf6; color: white; border: none; border-radius: 8px; font-weight: bold; cursor: pointer;";
  btnExportar.onclick = exportarTodoAExcel;
  
  UI.resumen.appendChild(btnExportar);
}

// ------------------ Sistema de Fichajes Dinámicos en Tiempo Real ------------------
function ficharEntrada() {
  if (!fechaSeleccionadaGlobal) return;
  const horaStr = new Date().toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  UI.manualEntrada.value = horaStr;

  if (!cacheDatos[fechaSeleccionadaGlobal])
    cacheDatos[fechaSeleccionadaGlobal] = {};

  cacheDatos[fechaSeleccionadaGlobal].entrada = horaStr;
  // Aseguramos que guarde el tipo seleccionado en el UI
  cacheDatos[fechaSeleccionadaGlobal].tipo = UI.tipo.value;

  localStorage.setItem("calendario_datos", JSON.stringify(cacheDatos));
  actualizarPanelTurnosSuperior(cacheDatos[fechaSeleccionadaGlobal]);
  generarCalendario();
  mostrarResumen(); // Actualizamos el resumen tras fichar
  cerrar();
}

function ficharSalida() {
  if (!fechaSeleccionadaGlobal) {
    alert("Error: Debes abrir un día antes de fichar.");
    return;
  }

  const ahora = new Date();
  const horaStr = `${String(ahora.getHours()).padStart(2, "0")}:${String(ahora.getMinutes()).padStart(2, "0")}`;

  UI.manualSalida.value = horaStr;

  if (!cacheDatos[fechaSeleccionadaGlobal])
    cacheDatos[fechaSeleccionadaGlobal] = {};

  cacheDatos[fechaSeleccionadaGlobal].salida = horaStr;
  cacheDatos[fechaSeleccionadaGlobal].tipo = UI.tipo.value;

  // Cálculo de amplitud
  if (cacheDatos[fechaSeleccionadaGlobal].entrada) {
    cacheDatos[fechaSeleccionadaGlobal].amplitud = calcularHorasEntreFichajes(
      cacheDatos[fechaSeleccionadaGlobal].entrada,
      horaStr,
    );
  }

  localStorage.setItem("calendario_datos", JSON.stringify(cacheDatos));
  console.log("Fichaje salida guardado en:", fechaSeleccionadaGlobal);

  actualizarPanelTurnosSuperior(cacheDatos[fechaSeleccionadaGlobal]);
  generarCalendario();
  mostrarResumen(); // Actualizamos el resumen tras fichar
  cerrar();
}

function eliminarDia() {
  if (!fechaSeleccionadaGlobal) return;
  delete cacheDatos[fechaSeleccionadaGlobal];
  localStorage.setItem("calendario_datos", JSON.stringify(cacheDatos));
  cerrar();
  mostrarResumen(); // Actualizamos el resumen tras eliminar
  generarCalendario();
}

function convertirStringADecimal(str) {
    if (!str) return 0;
    // Esto limpia el valor ("2:15h" o "2:15") y lo divide
    let partes = str.replace('h', '').trim().split(':');
    let horas = parseInt(partes[0]) || 0;
    let minutos = parseInt(partes[1]) || 0;
    
    // Convertimos a decimal real (ej: 2:15 -> 2.25)
    return horas + (minutos / 60);
}

// ------------------ Registro de Jornadas Manuales con Validación Estricta (incluye Turnos Partidos) ------------------
function aplicarHorarioManual() {
  if (!fechaSeleccionadaGlobal) return;

  // 1. Obtener tipo actual
  let tipoSeleccionado = UI.tipo.value || cacheDatos[fechaSeleccionadaGlobal]?.tipo || "viajes";

  // 2. Obtener valores de entrada y salida
  let hEntrada = UI.manualEntrada.value;
  let hSalida = UI.manualSalida.value;

  if (!hEntrada || !hSalida) {
    alert("Por favor, rellena al menos la entrada y la salida.");
    return;
  }

  let amplitudTotal = calcularHorasEntreFichajes(hEntrada, hSalida);
  let extras = [];

 // 2. Procesar turnos extra
  const filasExtra = document.querySelectorAll(".turno-extra");
  filasExtra.forEach((fila) => {
    // Estas clases DEBEN coincidir con las que pusiste en el innerHTML de agregarFilaExtra
    let inputEntrada = fila.querySelector(".extra-ent");
    let inputSalida = fila.querySelector(".extra-sal");
    
    // Verificamos que los inputs existan antes de leer el .value
    if (inputEntrada && inputSalida) {
        let ent = inputEntrada.value;
        let sal = inputSalida.value;
        
        if (ent && sal) {
          amplitudTotal += calcularHorasEntreFichajes(ent, sal);
          extras.push({ ent, sal });
        }
    }
  });

  // 4. Obtener Conducción y Otros (usando los nuevos campos divididos)
  let hCond = (parseInt(document.getElementById('condH').value) || 0) + 
              ((parseInt(document.getElementById('condM').value) || 0) / 60);
              
  let hOtros = (parseInt(document.getElementById('otrosH').value) || 0) + 
               ((parseInt(document.getElementById('otrosM').value) || 0) / 60);
               
  let sumaIntroducida = hCond + hOtros;
  let diferencia = amplitudTotal - sumaIntroducida;

  // 5. Validación
  if (Math.abs(diferencia) > 0.05) {
    let totalMinutos = Math.round(Math.abs(diferencia) * 60);
    let horas = Math.floor(totalMinutos / 60);
    let minutos = totalMinutos % 60;
    let tiempoFormateado = horas > 0 ? `${horas}h ${minutos}m` : `${minutos}m`;

    alert(diferencia > 0 
      ? `⚠️ Faltan ${tiempoFormateado} por asignar.` 
      : `⚠️ Te sobran ${tiempoFormateado} asignados.`);
    return;
  }

  // 6. Guardar en caché
  cacheDatos[fechaSeleccionadaGlobal] = {
    tipo: tipoSeleccionado,
    nota: UI.notas.value,
    entrada: hEntrada,
    salida: hSalida,
    horasConduccion: hCond,
    horasOtrosTrabajos: hOtros,
    turnosExtra: extras,
    amplitud: amplitudTotal,
  };

  localStorage.setItem("calendario_datos", JSON.stringify(cacheDatos));

  // 7. Cierre y actualización
  if (typeof cerrar === "function") cerrar();
  generarCalendario();
  mostrarResumen();
  console.log("Horario guardado correctamente");
}

function aplicarUrbanoAutomatico() {
  if (!fechaSeleccionadaGlobal) {
    alert("Selecciona un día primero.");
    return;
  }

  // Definimos los datos correctamente una sola vez
  cacheDatos[fechaSeleccionadaGlobal] = {
    tipo: "urbano", // <--- CORREGIDO: Ahora sí es urbano
    nota: "Horario Urbano Automático",
    entrada: "07:15",
    salida: "15:15",
    horasConduccion: 7.25,
    horasOtrosTrabajos: 0.75,
    turnosExtra: [],
    amplitud: 8,
  };

  // Guardar en localStorage
  localStorage.setItem("calendario_datos", JSON.stringify(cacheDatos));

  // Actualizar interfaz
  generarCalendario();
  mostrarResumen(); // Ahora el resumen contará correctamente el tipo "urbano"
  cerrar();

  console.log(
    "Horario urbano aplicado correctamente a:",
    fechaSeleccionadaGlobal,
  );
}

function cerrar() {
  formulario.classList.add("hidden");
}

function actualizarPanelTurnosSuperior(datos) {
  if (listaTurnos) {
    if (datos.entrada && datos.salida) {
      // 1. Usamos tu función para que los números salgan limpios (2:20h en vez de 2.3333h)
      let hCond = decimalAHora(datos.horasConduccion || 0);
      let hOtros = decimalAHora(datos.horasOtrosTrabajos || 0);
      
      let extrasHtml = "";
      if (datos.turnosExtra && datos.turnosExtra.length > 0) {
        // 2. Creamos bloques visuales para los turnos extra en lugar de una lista con comas
        let itemsExtras = datos.turnosExtra.map((t) => 
          `<span style="background: #334155; padding: 2px 6px; border-radius: 4px; font-size: 0.85em; margin-right: 5px;">${t.ent} a ${t.sal}</span>`
        ).join('');
        
        extrasHtml = `<div style="margin-top: 8px;">➕ <b>Turnos partidos:</b><br>${itemsExtras}</div>`;
      }

      // 3. Montamos el HTML final con estilo limpio
      listaTurnos.innerHTML = `
        <div style="line-height: 1.6;">
          ⏱️ Jornada: de <b>${datos.entrada}</b> a <b>${datos.salida}</b>
          ${extrasHtml}
          <div style="margin-top: 8px;">
            💾 Conducción: <b>${hCond}</b> | Otros: <b>${hOtros}</b>
          </div>
        </div>`;
    } else {
      listaTurnos.innerHTML = `🔮 Sin actividad registrada hoy. Tienes margen seguro para fichar.`;
    }
  }
}

function guardarTipo() {
  if (!fechaSeleccionadaGlobal) return;
  if (!cacheDatos[fechaSeleccionadaGlobal])
    cacheDatos[fechaSeleccionadaGlobal] = {};

  cacheDatos[fechaSeleccionadaGlobal].tipo = UI.tipo.value; // CAMBIADO
  cacheDatos[fechaSeleccionadaGlobal].nota = UI.notas.value; // CAMBIADO

  localStorage.setItem("calendario_datos", JSON.stringify(cacheDatos));
  cerrar();
  generarCalendario();
  mostrarResumen(); // Actualizamos el resumen tras guardar
}
//Funciones para importar y expotar backup
function exportarBackup() {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(cacheDatos));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "backup_calendario.json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
}

function importarBackup(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const contenido = JSON.parse(e.target.result);
            cacheDatos = contenido;
            guardarDatos(cacheDatos); // Usamos tu función de storage.js
            generarCalendario();
            mostrarResumen();
            alert("Backup restaurado con éxito.");
        } catch (err) {
            alert("Error al leer el archivo. Asegúrate de que sea un JSON válido.");
        }
    };
    reader.readAsText(file);
}

function exportarTodoAExcel() {
  const todasLasFechas = Object.keys(cacheDatos);
  if (todasLasFechas.length === 0) return;

  // Función interna para convertir decimal a formato HH:MM
  const decimalAHoraFormato = (decimal) => {
    let horas = Math.floor(decimal || 0);
    let minutos = Math.round(((decimal || 0) % 1) * 60);
    return `${horas.toString().padStart(2, '0')}:${minutos.toString().padStart(2, '0')}`;
  };

  let csvContent = "\uFEFF"; 
  csvContent += "Fecha,Tipo,Entrada,Salida,Conducción,Otros,Amplitud,Notas\n";
  
  todasLasFechas.sort().forEach(fecha => {
    const d = cacheDatos[fecha];
    const notaLimpia = (d.nota || "").replace(/,/g, " ").replace(/\n/g, " ");
    
    // Usamos nuestra nueva función de formato
    const cond = decimalAHoraFormato(d.horasConduccion);
    const otros = decimalAHoraFormato(d.horasOtrosTrabajos);
    const amp = decimalAHoraFormato(d.amplitud);
    
    csvContent += `${fecha},${d.tipo || ""},${d.entrada || ""},${d.salida || ""},${cond},${otros},${amp},${notaLimpia}\n`;
  });

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", "Resumen_Historico.csv");
  link.click();
}
// ... (Pega aquí el resto de tus funciones como aplicarHorarioManual, ficharEntrada, etc.)
