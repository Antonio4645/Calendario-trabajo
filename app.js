// ------------------ Inicialización del Estado Global ------------------
let cacheDatos = JSON.parse(localStorage.getItem('calendario_datos')) || {};
let fechaActual = new Date();
let mes = fechaActual.getMonth();
let año = fechaActual.getFullYear();
let fechaSeleccionadaGlobal = null;

const nombresMes = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

// Selectores del DOM
const calendar = document.getElementById("calendar");
const mesActualTexto = document.getElementById("mesActual");
const formulario = document.getElementById("formulario");
const fechaSeleccionadaTxt = document.getElementById("fechaSeleccionada");
const tipoSelect = document.getElementById("tipo");
const notasTextArea = document.getElementById("notas");
const inputEntrada = document.getElementById("manualEntrada");
const inputSalida = document.getElementById("manualSalida");
const inputConduccion = document.getElementById("manualConduccion");
const inputOtrosTrabajos = document.getElementById("manualOtrosTrabajos");
const listaTurnos = document.getElementById("listaTurnos"); 

// ------------------ Utilidades de Tiempo Comunes ------------------
function parsearFechaAString(d) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function calcularHorasEntreFichajes(h1, h2) {
    if (!h1 || !h2) return 0;
    let [arrH1, arrM1] = h1.split(":").map(Number);
    let [arrH2, arrM2] = h2.split(":").map(Number);
    let m1 = arrH1 * 60 + arrM1;
    let m2 = arrH2 * 60 + arrM2;
    if (m2 < m1) m2 += 24 * 60; // Salto de día medianoche
    return (m2 - m1) / 60;
}

// ------------------ Construcción del Calendario Visual ------------------
function generarCalendario(){
    if (!calendar || !mesActualTexto) return;

    try {
        calendar.innerHTML = "";
        mesActualTexto.innerText = `${nombresMes[mes]} ${año}`;

        let diasMes = new Date(año, mes + 1, 0).getDate();
        let primerDia = new Date(año, mes, 1).getDay();
        if(primerDia === 0) primerDia = 7; 

        let objetoHoy = new Date();
        let fechaHoyReal = parsearFechaAString(objetoHoy);

        for(let i = 1; i < primerDia; i++) {
            calendar.appendChild(document.createElement("div"));
        }

        for(let i = 1; i <= diasMes; i++){
            try {
                let div = document.createElement("div");
                div.classList.add("day");

                let fecha = `${año}-${String(mes+1).padStart(2,'0')}-${String(i).padStart(2,'0')}`;
                div.dataset.fecha = fecha;
                div.addEventListener("click", () => abrirFormulario(fecha));

                let objetoFecha = new Date(año, mes, i);
                let diaSemana = objetoFecha.getDay(); 
                if(diaSemana === 0 || diaSemana === 6) div.classList.add("fin-de-semana");
                if(fecha === fechaHoyReal) div.classList.add("hoy-actual");

                let datos = cacheDatos[fecha] || null;
                let letra = ""; 

                if(datos){
                    let tipoDia = datos.tipo || "viajes";
                    div.classList.add(tipoDia);
                    
                    letra = tipoDia==="viajes"?"V":
                            tipoDia==="vacaciones"?"VAC":
                            tipoDia==="festivo"?"F":
                            tipoDia==="festivo-trabajado"?"FT":
                            tipoDia==="urbano"?"TU":"";
                    
                    let horasCond = parseFloat(datos.horasConduccion) || 0;
                    let horasOtros = parseFloat(datos.horasOtrosTrabajos) || 0;

                    if(horasCond > 0 || horasOtros > 0) {
                        letra += ` (${horasCond}h C`;
                        if(horasOtros > 0) {
                            letra += ` / ${horasOtros}h T`; // 🌟 CORREGIDO: Solucionado error de la variable 'letter'
                        }
                        letra += `)`;
                    }

                    if(datos.nota && datos.nota.trim() !== "") {
                        let dot = document.createElement("span");
                        dot.classList.add("indicador-nota");
                        dot.innerHTML = "✏️";
                        div.appendChild(dot);
                    }
                }

                let contenedorNum = document.createElement("span");
                contenedorNum.classList.add("num-dia");
                contenedorNum.innerText = i;
                div.appendChild(contenedorNum);

                if(letra){
                    let contenedorInfo = document.createElement("span");
                    contenedorInfo.classList.add("info-turno");
                    contenedorInfo.innerText = letra;
                    div.appendChild(contenedorInfo);
                }

                calendar.appendChild(div);
            } catch (errDia) {
                console.error(errDia);
            }
        }
        mostrarResumen();
    } catch (errorFatal) {
        console.error(errorFatal);
    }
}

// ------------------ Navegación de Meses ------------------
function mesAnterior() {
    mes--;
    if (mes < 0) { mes = 11; año--; }
    generarCalendario();
}

function mesSiguiente() {
    mes++;
    if (mes > 11) { mes = 0; año++; }
    generarCalendario();
}

// ------------------ Operaciones del Formulario / Modal ------------------
function abrirFormulario(fecha) {
    fechaSeleccionadaGlobal = fecha;
    let parts = fecha.split("-");
    fechaSeleccionadaTxt.innerText = `${parts[2]}/${parts[1]}/${parts[0]}`;

    let datos = cacheDatos[fecha] || {};
    tipoSelect.value = datos.tipo || "viajes";
    notasTextArea.value = datos.nota || "";
    inputEntrada.value = datos.entrada || "06:00";
    inputSalida.value = datos.salida || "19:30";
    inputConduccion.value = datos.horasConduccion !== undefined ? datos.horasConduccion : "";
    inputOtrosTrabajos.value = datos.horasOtrosTrabajos !== undefined ? datos.horasOtrosTrabajos : "";

    actualizarPanelTurnosSuperior(datos);

    formulario.classList.remove("hidden");
    actualizarContadorTiempoReal();
}

function cerrar() {
    formulario.classList.add("hidden");
}

function actualizarPanelTurnosSuperior(datos) {
    if (listaTurnos) {
        if (datos.entrada && datos.salida) {
            let hCond = datos.horasConduccion || 0;
            let hOtros = datos.horasOtrosTrabajos || 0;
            listaTurnos.innerHTML = `⏱️ Jornada: de <b>${datos.entrada}</b> a <b>${datos.salida}</b><br>💾 Conducción: <b>${hCond}h</b> | Otros: <b>${hOtros}h</b>`;
        } else {
            listaTurnos.innerHTML = `🔮 Sin actividad registrada hoy. Tienes margen seguro para fichar.`;
        }
    }
}

function guardarTipo() {
    if (!fechaSeleccionadaGlobal) return;
    if (!cacheDatos[fechaSeleccionadaGlobal]) cacheDatos[fechaSeleccionadaGlobal] = {};

    cacheDatos[fechaSeleccionadaGlobal].tipo = tipoSelect.value;
    cacheDatos[fechaSeleccionadaGlobal].nota = notasTextArea.value;

    localStorage.setItem('calendario_datos', JSON.stringify(cacheDatos));
    cerrar();
    generarCalendario();
}

// ------------------ Sistema de Fichajes Dinámicos en Tiempo Real ------------------
function ficharEntrada() {
    if (!fechaSeleccionadaGlobal) return;
    
    const ahora = new Date();
    const horaStr = `${String(ahora.getHours()).padStart(2, '0')}:${String(ahora.getMinutes()).padStart(2, '0')}`;
    
    inputEntrada.value = horaStr;
    
    if (!cacheDatos[fechaSeleccionadaGlobal]) cacheDatos[fechaSeleccionadaGlobal] = {};
    cacheDatos[fechaSeleccionadaGlobal].entrada = horaStr;
    cacheDatos[fechaSeleccionadaGlobal].tipo = tipoSelect.value;
    cacheDatos[fechaSeleccionadaGlobal].nota = notasTextArea.value;
    
    localStorage.setItem('calendario_datos', JSON.stringify(cacheDatos));
    actualizarPanelTurnosSuperior(cacheDatos[fechaSeleccionadaGlobal]);
    
    cerrar();
    generarCalendario();
}

function ficharSalida() {
    if (!fechaSeleccionadaGlobal) return;
    
    const ahora = new Date();
    const horaStr = `${String(ahora.getHours()).padStart(2, '0')}:${String(ahora.getMinutes()).padStart(2, '0')}`;
    
    inputSalida.value = horaStr;
    
    if (!cacheDatos[fechaSeleccionadaGlobal]) cacheDatos[fechaSeleccionadaGlobal] = {};
    cacheDatos[fechaSeleccionadaGlobal].salida = horaStr;
    cacheDatos[fechaSeleccionadaGlobal].tipo = tipoSelect.value;
    cacheDatos[fechaSeleccionadaGlobal].nota = notasTextArea.value;
    
    localStorage.setItem('calendario_datos', JSON.stringify(cacheDatos));
    actualizarPanelTurnosSuperior(cacheDatos[fechaSeleccionadaGlobal]);
    
    cerrar();
    generarCalendario();
}

function eliminarDia() {
    if (!fechaSeleccionadaGlobal) return;
    delete cacheDatos[fechaSeleccionadaGlobal];
    localStorage.setItem('calendario_datos', JSON.stringify(cacheDatos));
    cerrar();
    generarCalendario();
}

// ------------------ Registro de Jornadas Manuales con Validación Estricta ------------------
function aplicarHorarioManual() {
    if (!fechaSeleccionadaGlobal) return;

    let hEntrada = inputEntrada.value;
    let hSalida = inputSalida.value;
    
    let amplitudTotal = calcularHorasEntreFichajes(hEntrada, hSalida);

    let hCond = parseFloat(inputConduccion.value) || 0;
    let hOtros = parseFloat(inputOtrosTrabajos.value) || 0;
    let sumaIntroducida = hCond + hOtros;

    let diferencia = amplitudTotal - sumaIntroducida;

    if (Math.abs(diferencia) > 0.02) { 
        let totalMinutosDiferencia = Math.round(diferencia * 60);
        
        if (totalMinutosDiferencia > 0) {
            let hDesc = Math.floor(totalMinutosDiferencia / 60);
            let mDesc = totalMinutosDiferencia % 60;
            let textoFalta = hDesc > 0 ? `${hDesc}h y ${mDesc}min` : `${mDesc}min`;
            
            alert(`⚠️ No se puede guardar:\n\nLa amplitud total de tu jornada es de ${amplitudTotal.toFixed(2)}h.\nHas introducido ${hCond}h de conducción y ${hOtros}h de otros trabajos.\n\nTe falta por asignar exactamente: ${textoFalta}.`);
        } else {
            let totalMinutosSobrantes = Math.abs(totalMinutosDiferencia);
            let hDesc = Math.floor(totalMinutosSobrantes / 60);
            let mDesc = totalMinutosSobrantes % 60;
            let textoSobra = hDesc > 0 ? `${hDesc}h y ${mDesc}min` : `${mDesc}min`;
            
            alert(`⚠️ No se puede guardar:\n\nTe has pasado asignando horas.\nLa amplitud real de tu jornada es de ${amplitudTotal.toFixed(2)}h, pero has metido una suma de ${sumaIntroducida.toFixed(2)}h.\n\nTe sobran exactamente: ${textoSobra}.`);
        }
        return; 
    }

    cacheDatos[fechaSeleccionadaGlobal] = {
        tipo: tipoSelect.value,
        nota: notasTextArea.value,
        entrada: hEntrada,
        salida: hSalida,
        horasConduccion: hCond,
        horasOtrosTrabajos: hOtros,
        amplitud: amplitudTotal
    };

    localStorage.setItem('calendario_datos', JSON.stringify(cacheDatos));
    cerrar();
    generarCalendario();
}

function aplicarUrbanoAutomatico() {
    if (!fechaSeleccionadaGlobal) return;

    cacheDatos[fechaSeleccionadaGlobal] = {
        tipo: "urbano",
        nota: notasTextArea.value,
        entrada: "07:15",
        salida: "15:15",
        horasConduccion: 8.0,
        horasOtrosTrabajos: 0,
        amplitud: 8.0
    };

    localStorage.setItem('calendario_datos', JSON.stringify(cacheDatos));
    cerrar();
    generarCalendario();
}

// ------------------ Sistema Analítico de Tiempos y Alertas Bisemanales/Semanales ------------------
function mostrarResumen() {
    const resumenDiv = document.getElementById("resumen");
    if (!resumenDiv) return;

    let totalConduccionMes = 0;
    let totalOtrosTrabajosMes = 0;
    let viajesRegistrados = 0;
    let festivosTrabajados = 0;
    let vacaciones = 0;
    let urbano = 0;

    for (let f in cacheDatos) {
        let parts = f.split("-");
        if (parseInt(parts[0]) === año && parseInt(parts[1]) === (mes + 1)) {
            let d = cacheDatos[f];
            totalConduccionMes += parseFloat(d.horasConduccion) || 0;
            totalOtrosTrabajosMes += parseFloat(d.horasOtrosTrabajos) || 0;

            if (d.tipo === "viajes") viajesRegistrados++;
            if (d.tipo === "festivo-trabajado") festivosTrabajados++;
            if (d.tipo === "vacaciones") vacaciones++;
            if (d.tipo === "urbano") urbano++;
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
        if (acumulado14Dias > maxBisemanalDetectado) {
            maxBisemanalDetectado = acumulado14Dias;
        }
    }

    // --- ALGORITMO DE CONTADOR DE AMPLIACIONES SEMANALES ---
    let ampliacionesEstaSemana = 0;
    let hoy = new Date();
    let diaSemanaHoy = hoy.getDay();
    if(diaSemanaHoy === 0) diaSemanaHoy = 7; 
    
    let lunesSemana = new Date(hoy);
    lunesSemana.setDate(hoy.getDate() - (diaSemanaHoy - 1));

    for(let k = 0; k < 7; k++) {
        let loopDia = new Date(lunesSemana);
        loopDia.setDate(lunesSemana.getDate() + k);
        let stringDiaSem = parsearFechaAString(loopDia);
        
        if(cacheDatos[stringDiaSem]) {
            let condDia = parseFloat(cacheDatos[stringDiaSem].horasConduccion) || 0;
            if(condDia > 9.0) {
                ampliacionesEstaSemana++;
            }
        }
    }

    // --- RENDERIZACIÓN DE ALERTAS DINÁMICAS ---
    let tarjetaAlertas = "";

    if (maxBisemanalDetectado > 90) {
        tarjetaAlertas += `
            <div style="background: rgba(239, 68, 68, 0.2); border: 1px solid #ef4444; color: #fca5a5; padding: 12px; border-radius: 10px; font-size: 0.9em; margin-bottom: 10px;">
                🚨 <b>Exceso Bisemanal Detectado:</b> Llevas acumulado un pico de <b>${maxBisemanalDetectado.toFixed(1)}h</b> de conducción en un bloque quincenal. (Máximo legal 90h). ¡Peligro de sanción!
            </div>
        `;
    } else {
        let margenQ = 90 - maxBisemanalDetectado;
        tarjetaAlertas += `
            <div style="background: rgba(16, 185, 129, 0.15); border: 1px solid #10b981; color: #a7f3d0; padding: 12px; border-radius: 10px; font-size: 0.9em; margin-bottom: 10px;">
                📅 <b>Control Quincenal:</b> El pico máximo detectado es de <b>${maxBisemanalDetectado.toFixed(1)}h</b>. Te queda un margen seguro de <b>${margenQ.toFixed(1)}h</b> de conducción volante.
            </div>
        `;
    }

    if(ampliacionesEstaSemana >= 2) {
        tarjetaAlertas += `
            <div style="background: rgba(245, 158, 11, 0.2); border: 1px solid #f59e0b; color: #fde68a; padding: 12px; border-radius: 10px; font-size: 0.9em; margin-bottom: 10px;">
                ⚠️ <b>Ampliaciones Semanales Agotadas:</b> Ya has realizado <b>${ampliacionesEstaSemana}</b> jornadas de conducción de más de 9h esta semana. Límite estricto para los días restantes de esta semana: **9h 00m**.
            </div>
        `;
    } else {
        let restantesAmp = 2 - ampliacionesEstaSemana;
        tarjetaAlertas += `
            <div style="background: rgba(56, 189, 248, 0.15); border: 1px solid #38bdf8; color: #bae6fd; padding: 12px; border-radius: 10px; font-size: 0.9em; margin-bottom: 10px;">
                🧵 <b>Ampliaciones a 10h:</b> Llevas <b>${ampliacionesEstaSemana}/2</b> esta semana. Puedes ampliar tu jornada diaria de conducción hasta las 10h un total de <b>${restantesAmp} vez/veces</b> más antes del Domingo.
            </div>
        `;
    }

    resumenDiv.innerHTML = `
        <div style="background: #1e293b; color: white; padding: 15px; border-radius: 12px; margin-top: 15px; box-shadow: 0 4px 6px rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.05);">
            <h3 style="margin-top: 0; border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 8px; color: #38bdf8; font-size: 1.1em;">📊 Resumen de ${nombresMes[mes]} ${año}</h3>
            
            <div style="display: flex; justify-content: space-between; margin: 8px 0; font-size: 0.95em;">
                <span style="color: #38bdf8; font-weight: bold;">🧵 Conducción Volante:</span>
                <span style="font-weight: bold;">${totalConduccionMes.toFixed(1)}h</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin: 8px 0; font-size: 0.95em;">
                <span style="color: #f97316; font-weight: bold;">⚒️ Otros Trabajos / Esperas:</span>
                <span style="font-weight: bold;">${totalOtrosTrabajosMes.toFixed(1)}h</span>
            </div>
            <div style="display: flex; justify-content: space-between; margin: 8px 0; padding-top: 6px; border-top: 1px dashed rgba(255,255,255,0.1); font-size: 1.05em;">
                <span style="color: #4ade80; font-weight: bold;">💼 TRABAJO TOTAL TOTAL:</span>
                <span style="color: #4ade80; font-weight: bold;">${totalHorasTrabajadasMes.toFixed(1)}h</span>
            </div>

            <hr style="border: none; border-top: 1px solid rgba(255,255,255,0.1); margin: 12px 0;">

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 0.85em; color: #cbd5e1; margin-bottom: 12px;">
                <div>✈️ Viajes Registrados: <b>${viajesRegistrados}</b></div>
                <div>🏢 Trabajos Urbanos: <b>${urbano}</b></div>
                <div>🎉 Festivos Trabajados: <b>${festivosTrabajados}</b></div>
                <div>🏖️ Días Vacaciones: <b>${vacaciones}</b></div>
            </div>

            ${tarjetaAlertas}
        </div>
    `;
}

function actualizarContadorTiempoReal() {}

document.addEventListener("DOMContentLoaded", () => {
    generarCalendario();
});