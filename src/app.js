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
  UI.manualConduccion.value = datos.horasConduccion ?? "";
  UI.manualOtrosTrabajos.value = datos.horasOtrosTrabajos ?? "";
  UI.contenedorTurnosExtra.innerHTML = "";
  (datos.turnosExtra || []).forEach((t) => agregarFilaExtra(t.ent, t.sal));
  actualizarPanelTurnosSuperior(datos);
  UI.formulario.classList.remove("hidden");
}

function agregarFilaExtra(ent = "", sal = "") {
  if (!UI.contenedorTurnosExtra) return;
  const div = document.createElement("div");
  div.className = "turno-extra";
  div.innerHTML = `<input type="time" class="extra-ent" value="${ent}"> a <input type="time" class="extra-sal" value="${sal}"> <button onclick="this.parentElement.remove()">x</button>`;
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

// ------------------ Registro de Jornadas Manuales con Validación Estricta (incluye Turnos Partidos) ------------------
function aplicarHorarioManual() {
  if (!fechaSeleccionadaGlobal) return;

  // 1. Obtener tipo actual: si el UI está vacío, recuperamos lo que ya hubiera
  let tipoSeleccionado = UI.tipo.value;
  if (!tipoSeleccionado || tipoSeleccionado === "") {
      tipoSeleccionado = cacheDatos[fechaSeleccionadaGlobal]?.tipo || "viajes";
  }

  // 1. Obtener valores de la interfaz
  let hEntrada = UI.manualEntrada.value;
  let hSalida = UI.manualSalida.value;

  if (!hEntrada || !hSalida) {
    alert("Por favor, rellena al menos la entrada y la salida.");
    return;
  }

  let amplitudTotal = calcularHorasEntreFichajes(hEntrada, hSalida);
  let extras = [];

  // 2. Procesar turnos extra si existen
  const filasExtra = document.querySelectorAll(".turno-extra");
  filasExtra.forEach((fila) => {
    let ent = fila.querySelector(".extra-ent").value;
    let sal = fila.querySelector(".extra-sal").value;
    if (ent && sal) {
      amplitudTotal += calcularHorasEntreFichajes(ent, sal);
      extras.push({ ent, sal });
    }
  });

  let hCond = parseFloat(UI.manualConduccion.value) || 0;
  let hOtros = parseFloat(UI.manualOtrosTrabajos.value) || 0;
  let sumaIntroducida = hCond + hOtros;

  let diferencia = amplitudTotal - sumaIntroducida;

  // 3. Validación estricta
  if (Math.abs(diferencia) > 0.05) {
    // Un margen de 3 minutos (0.05h) es más razonable
    let totalMinutos = Math.round(Math.abs(diferencia) * 60);
    let horas = Math.floor(totalMinutos / 60);
    let minutos = totalMinutos % 60;
    let tiempoFormateado = horas > 0 ? `${horas}h ${minutos}m` : `${minutos}m`;

    if (diferencia > 0) {
      alert(
        `⚠️ Faltan horas por asignar:\n\n` +
          `Amplitud total de jornada: ${amplitudTotal.toFixed(2)}h\n` +
          `Suma introducida: ${sumaIntroducida.toFixed(2)}h\n\n` +
          `Para cuadrar la jornada, te falta por asignar: ${tiempoFormateado}.`,
      );
    } else {
      alert(
        `⚠️ Te has pasado asignando horas:\n\n` +
          `Amplitud total de jornada: ${amplitudTotal.toFixed(2)}h\n` +
          `Suma introducida: ${sumaIntroducida.toFixed(2)}h\n\n` +
          `Te sobran exactamente: ${tiempoFormateado}.`,
      );
    }
    return; // Detener el guardado si hay discrepancia
  }

  // 4. Guardar
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

  // 5. Cerrar y actualizar
  if (typeof cerrar === "function") cerrar();
  generarCalendario();
  mostrarResumen(); // Actualizamos el resumen tras guardar
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
      let hCond = datos.horasConduccion || 0;
      let hOtros = datos.horasOtrosTrabajos || 0;
      let extrasHtml = "";
      if (datos.turnosExtra && datos.turnosExtra.length > 0) {
        extrasHtml =
          "<br>➕ Turnos partidos: " +
          datos.turnosExtra.map((t) => `${t.ent}-${t.sal}`).join(", ");
      }
      listaTurnos.innerHTML = `⏱️ Jornada: de <b>${datos.entrada}</b> a <b>${datos.salida}</b>${extrasHtml}<br>💾 Conducción: <b>${hCond}h</b> | Otros: <b>${hOtros}h</b>`;
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
// ... (Pega aquí el resto de tus funciones como aplicarHorarioManual, ficharEntrada, etc.)
