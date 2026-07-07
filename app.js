/* ==========================================================================
   LÓGICA DEL CALENDARIO DE ENTRADAS Y PROTECCIÓN INTEGRAL DE DATOS
   ========================================================================== */

const calendar = document.getElementById("calendar");
const mesActualTexto = document.getElementById("mesActual");
const formulario = document.getElementById("formulario");
const fechaSeleccionada = document.getElementById("fechaSeleccionada");
const tipoSelect = document.getElementById("tipo");
const resumenDiv = document.getElementById("resumen");
const notasInput = document.getElementById("notas");
const listaTurnos = document.getElementById("listaTurnos");

let hoy = new Date();
let mes = hoy.getMonth();
let año = hoy.getFullYear();
let fechaActual = "";

const nombresMes = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];

// ------------------ Construcción del Calendario Visual ------------------
function generarCalendario(){
    calendar.innerHTML="";
    mesActualTexto.innerText = nombresMes[mes]+" "+año;

    let diasMes = new Date(año, mes+1,0).getDate();
    let primerDia = new Date(año, mes, 1).getDay();
    if(primerDia===0) primerDia=7;

    let objetoHoy = new Date();
    let fechaHoyReal = `${objetoHoy.getFullYear()}-${String(objetoHoy.getMonth()+1).padStart(2,'0')}-${String(objetoHoy.getDate()).padStart(2,'0')}`;

    for(let i=1; i<primerDia; i++) calendar.appendChild(document.createElement("div"));

    for(let i=1; i<=diasMes; i++){
        let div=document.createElement("div");
        div.classList.add("day");

        let fecha=`${año}-${String(mes+1).padStart(2,'0')}-${String(i).padStart(2,'0')}`;
        div.dataset.fecha = fecha;

        let objetoFecha = new Date(año, mes, i);
        let diaSemana = objetoFecha.getDay(); 
        if(diaSemana === 0 || diaSemana === 6) {
            div.classList.add("fin-de-semana");
        }

        if(fecha === fechaHoyReal) {
            div.classList.add("hoy-actual");
        }

        let datos = JSON.parse(localStorage.getItem(fecha));
        let letra="";

        if(datos){
            div.classList.add(datos.tipo);
            letra = datos.tipo==="normal"?"T":
                    datos.tipo==="vacaciones"?"V":
                    datos.tipo==="festivo"?"F":
                    datos.tipo==="festivo-trabajado"?"FT":
                    datos.tipo==="urbano"?"TU":"";
            if(datos.horas) letra+=" ("+datos.horas+")";

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

        div.onclick=()=>abrirFormulario(fecha);
        calendar.appendChild(div);
    }
    mostrarResumen();
}

// ------------------ Panel de Acciones (Formulario + Tacógrafo Dinámico) ------------------
function abrirFormulario(fecha){
    fechaActual=fecha;
    formulario.classList.remove("hidden");

    let partes = fecha.split("-");
    fechaSeleccionada.innerText = `${partes[2]}/${partes[1]}/${partes[0]}`;

    let datos=JSON.parse(localStorage.getItem(fecha));
    tipoSelect.value=datos?datos.tipo:"normal";
    notasInput.value=datos?datos.nota||"":"";

    listaTurnos.innerHTML = "<strong>Turnos del día:</strong><br>";
    
    let primerFichajeEntrada = null;
    let ultimoFichajeSalida = null;
    let horasTrabajadasHoy = 0;

    if(datos && datos.turnos && datos.turnos.length){
        datos.turnos.forEach((t,i)=>{
            if(t.entrada) {
                if(!primerFichajeEntrada) primerFichajeEntrada = t.entrada;
                if(t.salida){
                    ultimoFichajeSalida = t.salida;
                    let [hE,mE] = t.entrada.split(":").map(Number);
                    let [hS,mS] = t.salida.split(":").map(Number);
                    
                    let minutos = (hS*60+mS)-(hE*60+mE);
                    if(minutos < 0) minutos += 1440; 

                    horasTrabajadasHoy += minutos / 60;

                    let horas = Math.floor(minutos/60);
                    let mins = minutos % 60; // 🛠️ CORREGIDO: Solucionado error tipográfico "minutes"
                    listaTurnos.innerHTML += `T${i+1}: ${t.entrada} - ${t.salida} (${horas}h ${mins}m)<br>`;
                } else {
                    listaTurnos.innerHTML += `T${i+1}: ${t.entrada} - ...<br>`;
                }
            }
        });
    } else {
        listaTurnos.innerHTML += "No hay turnos fichados aún.<br>";
    }

    // 🚌 CONTADOR DIARIO DINÁMICO DE CONDUCCIÓN DISPOLIBLE
    actualizarBannerContador(horasTrabajadasHoy);

    listaTurnos.innerHTML += "<hr style='border:0; border-top:1px dashed #334155; margin:8px 0;'>";
    
    if(primerFichajeEntrada && ultimoFichajeSalida) {
        let [hE, mE] = primerFichajeEntrada.split(":").map(Number);
        let [hS, mS] = ultimoFichajeSalida.split(":").map(Number);
        let minAmplitud = (hS*60+mS) - (hE*60+mE);
        if(minAmplitud < 0) minAmplitud += 1440;
        let hAmp = Math.floor(minAmplitud/60);
        let mAmp = minAmplitud % 60;
        
        let alertaDisco = hAmp >= 13 ? "color:#f87171; font-weight:bold;" : "color:#cbd5e1;";
        listaTurnos.innerHTML += `<span style="${alertaDisco}">📊 Amplitud (Disco): ${hAmp}h ${mAmp}m ${hAmp>=13?'⚠️':''}</span><br>`;
    }

    let fechaPrev = new Date(partes[0], partes[1]-1, partes[2]-1);
    let keyPrev = `${fechaPrev.getFullYear()}-${String(fechaPrev.getMonth()+1).padStart(2,'0')}-${String(fechaPrev.getDate()).padStart(2,'0')}`;
    let datosPrev = JSON.parse(localStorage.getItem(keyPrev));
    
    if(datosPrev && datosPrev.turnos && datosPrev.turnos.length && primerFichajeEntrada) {
        let ultTurnoPrev = datosPrev.turnos[datosPrev.turnos.length-1];
        if(ultTurnoPrev && ultTurnoPrev.salida) {
            let [hS_prev, mS_prev] = ultTurnoPrev.salida.split(":").map(Number);
            let [hE_hoy, mE_hoy] = primerFichajeEntrada.split(":").map(Number);
            
            let minDescanso = (hE_hoy*60+mE_hoy) + (1440 - (hS_prev*60+mS_prev));
            let hDesc = Math.floor(minDescanso/60);
            let mDesc = minDescanso % 60;
            
            if(hDesc < 11) {
                listaTurnos.innerHTML += `<span style="color:#f87171; font-weight:bold;">🚨 Descanso interjornada: ${hDesc}h ${mDesc}m (Menor a 11h!)</span><br>`;
            } else {
                listaTurnos.innerHTML += `<span style="color:#34d399;">🛡️ Descanso interjornada: ${hDesc}h ${mDesc}m (Correcto)</span><br>`;
            }
        }
    }
}

// 🛠️ EXTRAÍDO PARA REUTILIZACIÓN DIRECTA EN TIEMPO REAL
function actualizarBannerContador(horasTrabajadasHoy) {
    let limiteLegalDiario = 9;
    let horasDisponibles = limiteLegalDiario - horasTrabajadasHoy;
    const divContadorReal = document.getElementById("contador-tiempo-real");
    
    if (divContadorReal) {
        if (horasTrabajadasHoy === 0) {
            divContadorReal.innerHTML = `<div style="background: #1e293b; color: #cbd5e1; padding: 10px; border-radius: 8px; border: 1px solid #334155; margin-bottom: 12px; font-size: 0.9em; text-align: center;">⏱️ Sin actividad registrada hoy. Tienes <strong>9h 00m</strong> de margen.</div>`;
        } else if (horasDisponibles > 0) {
            let hDisp = Math.floor(horasDisponibles);
            let mDisp = Math.round((horasDisponibles - hDisp) * 60);
            divContadorReal.innerHTML = `<div style="background: #1e293b; color: #38bdf8; padding: 10px; border-radius: 8px; border: 1px solid #0284c7; margin-bottom: 12px; font-size: 0.9em; text-align: center;">⏱️ Llevas ${horasTrabajadasHoy.toFixed(1)}h. Te quedan <strong>${hDisp}h ${mDisp}m disponibles</strong> hoy.</div>`;
        } else if (horasDisponibles === 0) {
            divContadorReal.innerHTML = `<div style="background: #14532d; color: #4ade80; padding: 10px; border-radius: 8px; border: 1px solid #16a34a; margin-bottom: 12px; font-size: 0.9em; text-align: center;">✅ Límite legal diario alcanzado (9h). ¡Toca parar!</div>`;
        } else {
            let exceso = Math.abs(horasDisponibles);
            if (exceso <= 1) {
                divContadorReal.innerHTML = `<div style="background: #7c2d12; color: #fdba74; padding: 10px; border-radius: 8px; border: 1px solid #ea580c; margin-bottom: 12px; font-size: 0.9em; text-align: center;">⚠️ Usando ampliación (Máx 10h). Llevas ${horasTrabajadasHoy.toFixed(1)}h. Resto de margen crítico.</div>`;
            } else {
                divContadorReal.innerHTML = `<div style="background: #7f1d1d; color: #fca5a5; padding: 10px; border-radius: 8px; border: 1px solid #dc2626; margin-bottom: 12px; font-size: 0.9em; text-align: center;">🚨 ¡Exceso de jornada diaria! Has superado el límite de 9h/10h.</div>`;
            }
        }
    }
}

function cerrar(){
    formulario.classList.add("hidden");
}

// ------------------ Operaciones de Fichajes Inteligentes ------------------
function ficharEntrada(){
    let datos=JSON.parse(localStorage.getItem(fechaActual))||{};
    if(!datos.turnos) datos.turnos=[];

    let ultimoTurno = datos.turnos[datos.turnos.length-1];
    if(ultimoTurno && !ultimoTurno.salida){
        alert("Debes fichar la salida del turno actual antes de iniciar uno nuevo.");
        return;
    }

    let now=new Date();
    let hora = now.toLocaleTimeString('es-ES',{hour:'2-digit',minute:'2-digit'});
    datos.turnos.push({entrada:hora});
    datos.tipo = datos.tipo||"normal";
    datos.nota = notasInput.value||"";
    
    guardarCopiaAutomatica(); 
    localStorage.setItem(fechaActual,JSON.stringify(datos));
    
    generarCalendario();
    cerrar(); 
}

function ficharSalida(){
    let datos=JSON.parse(localStorage.getItem(fechaActual))||{};
    if(!datos.turnos || datos.turnos.length===0){
        alert("Primero debes fichar la entrada.");
        return;
    }

    let ultimoTurno = datos.turnos[datos.turnos.length-1];
    if(ultimoTurno.salida){
        alert("Este turno ya tiene salida.");
        return;
    }

    let now=new Date();
    let horaSalida = now.toLocaleTimeString('es-ES',{hour:'2-digit',minute:'2-digit'});
    ultimoTurno.salida = horaSalida;

    let totalMinutos = 0;
    datos.turnos.forEach(turno=>{
        if(turno.entrada && turno.salida){
            let [hE,mE] = turno.entrada.split(":").map(Number);
            let [hS,mS] = turno.salida.split(":").map(Number);
            
            let dif = (hS*60+mS)-(hE*60+mE);
            if(dif < 0) dif += 1440; 
            totalMinutos += dif;
        }
    });
    let horas = Math.floor(totalMinutos/60);
    let minutos = totalMinutos % 60;
    datos.horas = `${horas}h ${minutos}m`;
    datos.nota = notasInput.value||"";

    guardarCopiaAutomatica(); 
    localStorage.setItem(fechaActual,JSON.stringify(datos));
    
    generarCalendario();
    cerrar(); 
}

function guardarTipo(){
    let datos=JSON.parse(localStorage.getItem(fechaActual))||{};
    datos.tipo = tipoSelect.value;
    datos.nota = notasInput.value||"";

    guardarCopiaAutomatica(); 
    localStorage.setItem(fechaActual,JSON.stringify(datos));
    
    generarCalendario();
    cerrar();
}

function aplicarUrbanoAutomatico() {
    if (!fechaActual) return;

    let turnoUrbano = { entrada: "07:15", salida: "15:15" };
    const datosDia = {
        tipo: "urbano", 
        nota: notasInput.value || "", 
        turnos: [turnoUrbano],
        horas: "8h 00m" 
    };

    guardarCopiaAutomatica(); 
    localStorage.setItem(fechaActual, JSON.stringify(datosDia));
    
    generarCalendario();
    cerrar(); 
}

function eliminarDia(){
    if(localStorage.getItem(fechaActual)) {
        guardarCopiaAutomatica(); 
        localStorage.removeItem(fechaActual);
    }
    generarCalendario();
    cerrar();
}

// ------------------ Navegación Temporal ------------------
function mesAnterior(){
    mes--;
    if(mes<0){ mes=11; año--; }
    generarCalendario();
}
function mesSiguiente(){
    mes++;
    if(mes>11){ mes=0; año++; }
    generarCalendario();
}

// ------------------ MOTOR ANALÍTICO EN TIEMPO REAL (ESPAÑA - AUTOBÚS) ------------------
function analizarNormativaSemanal(filtroMesKey) {
    let alertas = [];
    let [anoFiltro, mesFiltro] = filtroMesKey.split("-").map(Number);
    let diasEnMes = new Date(anoFiltro, mesFiltro, 0).getDate();
    
    let diasConsecutivosTrabajo = 0;
    let ultimaSalidaTurno = null;
    let minutosQuincenales = 0;

    // 📋 1. Cálculo dinámico de Conducción Bisemanal (Límite 90 horas en España)
    Object.keys(localStorage).forEach(key => {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) return;
        let datosDia = JSON.parse(localStorage.getItem(key));
        if (datosDia && datosDia.horas) {
            let match = datosDia.horas.match(/(\d+)h (\d+)m/);
            if (match) {
                minutosQuincenales += parseInt(match[1]) * 60 + parseInt(match[2]);
            }
        }
    });

    let horasQuincenalesTotales = minutosQuincenales / 60;
    if (horasQuincenalesTotales > 90) {
        alertas.push(`🚨 Exceso Bisemanal: Llevas ${horasQuincenalesTotales.toFixed(1)}h de conducción en la quincena (Máximo legal 90h).`);
    } else if (horasQuincenalesTotales > 75) {
        let hRestantes = 90 - horasQuincenalesTotales;
        alertas.push(`⏱️ Margen Quincenal: Te quedan solo ${hRestantes.toFixed(1)}h de conducción seguras en el total de la quincena.`);
    }

    // 🔄 2. Análisis diario en orden secuencial con reset dinámico por descanso
    for (let i = 1; i <= diasEnMes; i++) {
        let fechaKey = `${anoFiltro}-${String(mesFiltro).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
        let datos = JSON.parse(localStorage.getItem(fechaKey));
        
        let esDiaTrabajado = datos && (datos.tipo === "normal" || datos.tipo === "urbano" || datos.tipo === "festivo-trabajado");

        if (esDiaTrabajado) {
            diasConsecutivosTrabajo++;
            
            if (ultimaSalidaTurno) {
                let [hE, mE] = datos.turnos && datos.turnos[0] && datos.turnos[0].entrada ? 
                               datos.turnos[0].entrada.split(":").map(Number) : [0, 0];
                
                let fechaActualObj = new Date(anoFiltro, mesFiltro - 1, i, hE, mE);
                let diffMilsegundos = Math.abs(fechaActualObj - ultimaSalidaTurno);
                let horasDeParonReal = diffMilsegundos / (1000 * 60 * 60);

                // Si ha descansado más de 24 horas (Descanso semanal completo o reducido en España)
                if (horasDeParonReal >= 24) {
                    if (horasDeParonReal < 45) {
                        if (!alertas.includes("⚠️ Descanso Semanal Reducido detectado (24h-44h). Próximo descanso obligado a ser Normal (min. 45h).")) {
                            alertas.push("⚠️ Descanso Semanal Reducido detectado (24h-44h). Próximo descanso obligado a ser Normal (min. 45h).");
                        }
                    }
                    // 🌟 RESET TOTAL EN TIEMPO REAL: Se rompe la acumulación de jornadas consecutivas
                    diasConsecutivosTrabajo = 1; 
                }
                ultimaSalidaTurno = null;
            }

            // Límite en España sin viaje internacional: Máximo 6 días seguidos
            if (diasConsecutivosTrabajo > 6) {
                if (!alertas.includes("🚨 Exceso de jornadas: Has superado los 6 días consecutivos de trabajo en España sin descanso semanal.")) {
                    alertas.push("🚨 Exceso de jornadas: Has superado los 6 días consecutivos de trabajo en España sin descanso semanal.");
                }
            }
        } else {
            // Guardamos marca del fin del turno anterior para ver el tamaño del parón
            let fechaAyerKey = `${anoFiltro}-${String(mesFiltro).padStart(2, '0')}-${String(i - 1).padStart(2, '0')}`;
            let datosAyer = JSON.parse(localStorage.getItem(fechaAyerKey));
            
            if (datosAyer && datosAyer.turnos && datosAyer.turnos.length) {
                let ultTurnoAyer = datosAyer.turnos[datosAyer.turnos.length - 1];
                if (ultTurnoAyer && ultTurnoAyer.salida) {
                    let [hS, mS] = ultTurnoAyer.salida.split(":").map(Number);
                    ultimaSalidaTurno = new Date(anoFiltro, mesFiltro - 1, i - 1, hS, mS);
                }
            }
            
            // 🌟 RESET TOTAL POR DÍA VACÍO: Rompe la secuencia de días encadenados
            diasConsecutivosTrabajo = 0;
        }
    }

    return alertas;
}

function calcularResumen(){
    let resumen={};
    Object.keys(localStorage).forEach(key=>{
        if(!/^\d{4}-\d{2}-\d{2}$/.test(key)) return;
        let datos=JSON.parse(localStorage.getItem(key));
        if(!datos) return;
        let [year,month]=key.split("-");
        let keyMes=`${year}-${month}`;
        if(!resumen[keyMes]) resumen[keyMes]={horas:0,normales:0,festivosTrab:0,vacaciones:0,urbanos:0};
        if(datos.horas){
            let match = datos.horas.match(/(\d+)h (\d+)m/);
            if(match) resumen[keyMes].horas += parseInt(match[1])*60 + parseInt(match[2]);
        }
        if(datos.tipo==="normal") resumen[keyMes].normales+=1;
        if(datos.tipo==="festivo-trabajado") resumen[keyMes].festivosTrab+=1;
        if(datos.tipo==="vacaciones") resumen[keyMes].vacaciones+=1;
        if(datos.tipo==="urbano") resumen[keyMes].urbanos+=1;
    });
    return resumen;
}

function mostrarResumen(){
    const resumen = calcularResumen();
    let html = "";
    for(let mesKey in resumen){
        const d = resumen[mesKey];
        let [year,month] = mesKey.split("-");
        let mesNombre = nombresMes[parseInt(month)-1]+" "+year;
        let horasTotales = Math.floor(d.horas/60);
        let minutosTotales = d.horas % 60;

        let alertasNormativa = analizarNormativaSemanal(mesKey);
        let htmlAlertas = "";
        
        if(alertasNormativa.length > 0) {
            let colorFondo = alertasNormativa.some(a => a.includes("🚨")) ? "#7f1d1d" : "#451a03";
            let colorBorde = alertasNormativa.some(a => a.includes("🚨")) ? "#b91c1c" : "#b45309";
            let colorTexto = alertasNormativa.some(a => a.includes("🚨")) ? "#fca5a5" : "#fde047";

            htmlAlertas = `<div style="margin-top:14px; padding:12px; background:${colorFondo}; border:1px solid ${colorBorde}; border-radius:8px; font-size:0.85em; color:${colorTexto}; font-weight:bold; display:flex; flex-direction:column; gap:8px;">`;
            alertasNormativa.forEach((alerta, index) => {
                let estiloSeparador = index < alertasNormativa.length - 1 ? "border-bottom: 1px dashed rgba(255,255,255,0.2); padding-bottom: 6px;" : "";
                htmlAlertas += `<div style="${estiloSeparador}">${alerta}</div>`;
            });
            htmlAlertas += `</div>`;
        } else {
            htmlAlertas = `<div style="margin-top:14px; padding:10px; background:#064e3b; border:1px solid #059669; border-radius:8px; font-size:0.85em; color:#a7f3d0; text-align:center; font-weight:bold;">📋 Tacógrafo limpio: Conforme con la normativa de transportes.</div>`;
        }

        html += `<div class="mes-card">
            <h3>${mesNombre}</h3>
            <div class="dato"><span>Horas trabajadas:</span><span>${horasTotales}h ${minutosTotales}m</span></div>
            <div class="dato"><span>Días normales:</span><span>${d.normales}</span></div>
            <div class="dato"><span>Festivos trabajados:</span><span>${d.festivosTrab}</span></div>
            <div class="dato"><span>Vacaciones:</span><span>${d.vacaciones}</span></div>
            <div class="dato"><span>Trabajo urbano:</span><span>${d.urbanos}</span></div>
            ${htmlAlertas}
        </div>`;
    }
    
    resumenDiv.innerHTML = html;

    let botonExistente = document.getElementById("btnExportarExcel");
    if (botonExistente) botonExistente.remove();

    if(html !== "") {
        let contenedorBoton = document.createElement("div");
        contenedorBoton.id = "btnExportarExcel";
        contenedorBoton.style.cssText = "text-align: center; margin: 30px auto; width: 90%; max-width: 400px; display: flex; flex-direction: column; gap: 12px; clear: both;";
        
        contenedorBoton.innerHTML = `
            <button onclick="exportarAExcel()" style="width: 100%; background: #16a34a; color: white; border: none; padding: 15px; font-size: 1.05em; font-weight: bold; border-radius: 12px; cursor: pointer; box-shadow: 0 4px 12px rgba(0,0,0,0.3); appearance: none; -webkit-appearance: none; -moz-appearance: none;">
                📥 Exportar Historial a Excel
            </button>
            
            <div style="display: flex; gap: 10px; width: 100%;">
                <button onclick="restaurarCopiaAutomatica()" style="flex: 1; background: #334155; color: white; border: 1px solid #475569; padding: 12px; font-size: 0.9em; font-weight: bold; border-radius: 10px; cursor: pointer; box-shadow: 0 4px 6px rgba(0,0,0,0.2);">
                    🔄 Usar Autoguardado
                </button>
                <button onclick="onClickSubirArchivo()" style="flex: 1; background: #1e293b; color: #cbd5e1; border: 1px solid #334155; padding: 12px; font-size: 0.9em; font-weight: bold; border-radius: 10px; cursor: pointer; box-shadow: 0 4px 6px rgba(0,0,0,0.2);">
                    🛡️ Cargar Archivo
                </button>
            </div>
            <div style="text-align: center;">
                <button onclick="crearCopiaSeguridad()" style="background: none; border: none; color: #64748b; font-size: 0.85em; text-decoration: underline; cursor: pointer; padding: 5px;">
                    📥 Guardar copia física (.json)
                </button>
            </div>
            <input type="file" id="inputBackup" style="display:none;" accept=".json" onchange="restaurarCopiaSeguridad(this)">
        `;
            
        resumenDiv.parentNode.insertBefore(contenedorBoton, resumenDiv.nextSibling);
    }
}

// ================= SISTEMA DE SEGURIDAD DEFENSIVO (BACKUPS) =================

function guardarCopiaAutomatica() {
    let datosApp = {};
    for (let i = 0; i < localStorage.length; i++) {
        let clave = localStorage.key(i);
        if (/^\d{4}-\d{2}-\d{2}$/.test(clave)) {
            datosApp[clave] = localStorage.getItem(clave);
        }
    }
    if (Object.keys(datosApp).length > 0) {
        localStorage.setItem('backup_automatico_interno', JSON.stringify(datosApp));
    }
}

function restaurarCopiaAutomatica() {
    const backup = localStorage.getItem('backup_automatico_interno');
    if (!backup) {
        alert("Aún no se ha consolidado ninguna copia automática en el sistema.");
        return;
    }

    if (confirm("⚠️ ¿Deseas deshacer los últimos cambios y restaurar el autoguardado previo?")) {
        const datosImportados = JSON.parse(backup);
        
        Object.keys(localStorage).forEach(clave => {
            if (/^\d{4}-\d{2}-\d{2}$/.test(clave)) localStorage.removeItem(clave);
        });

        Object.keys(datosImportados).forEach(clave => {
            if (datosImportados[clave] !== null) {
                localStorage.setItem(clave, datosImportados[clave]);
            }
        });
        
        alert("🔄 ¡Historial restablecido con éxito!");
        window.location.reload();
    }
}

function crearCopiaSeguridad() {
    let datosApp = {};
    for (let i = 0; i < localStorage.length; i++) {
        let clave = localStorage.key(i);
        if (/^\d{4}-\d{2}-\d{2}$/.test(clave)) datosApp[clave] = localStorage.getItem(clave);
    }

    if (Object.keys(datosApp).length === 0) {
        alert("No existen datos analíticos que exportar en este momento.");
        return;
    }

    let dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(datosApp));
    let downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `Copia_Seguridad_Calendario.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
}

function onClickSubirArchivo() {
    document.getElementById('inputBackup').click();
}

function restaurarCopiaSeguridad(input) {
    const archivo = input.files[0];
    if (!archivo) return;

    const lector = new FileReader();
    lector.onload = function(e) {
        try {
            const datosImportados = JSON.parse(e.target.result);
            const llaves = Object.keys(datosImportados);
            const estructuraValida = llaves.length > 0 && llaves.every(k => /^\d{4}-\d{2}-\d{2}$/.test(k));

            if (!estructuraValida) {
                alert("❌ Error: El archivo seleccionado no es una copia de seguridad válida de esta aplicación.");
                return;
            }

            if (confirm("¿Confirmas la inyección de este archivo externo? Sustituirá tu registro de horas actual.")) {
                Object.keys(localStorage).forEach(clave => {
                    if (/^\d{4}-\d{2}-\d{2}$/.test(clave)) localStorage.removeItem(clave);
                });

                llaves.forEach(clave => {
                    localStorage.setItem(clave, datosImportados[clave]);
                });

                guardarCopiaAutomatica(); 
                alert("¡Copia externa inyectada y asegurada con éxito!");
                window.location.reload();
            }
        } catch (error) {
            alert("❌ Error crítico: Archivo corrupto o ilegible.");
        }
    };
    lector.readAsText(archivo);
}

// ================= MOTOR DE GESTOS TÁCTILES (SWIPE) ANTIBLOQUEO =================

let toqueInicioX = 0;
let toqueInicioY = 0;

calendar.addEventListener('touchstart', (e) => {
    toqueInicioX = e.changedTouches[0].screenX;
    toqueInicioY = e.changedTouches[0].screenY;
}, { passive: true });

calendar.addEventListener('touchmove', (e) => {
    let difX = Math.abs(e.changedTouches[0].screenX - toqueInicioX);
    let difY = Math.abs(e.changedTouches[0].screenY - toqueInicioY);
    
    if (difX > difY && difX > 10) {
        if (e.cancelable) e.preventDefault(); 
    }
}, { passive: false });

calendar.addEventListener('touchend', (e) => {
    let toqueFinX = e.changedTouches[0].screenX;
    let toqueFinY = e.changedTouches[0].screenY;
    
    let distanciaX = toqueFinX - toqueInicioX;
    let distanciaY = toqueFinY - toqueInicioY;
    
    const umbralMinimo = 60;
    
    if (Math.abs(distanciaX) > Math.abs(distanciaY) && Math.abs(distanciaX) > umbralMinimo) {
        if (distanciaX < 0) {
            mesSiguiente();
        } else {
            mesAnterior();
        }
    }
}, { passive: true });

// ================= APLICAR HORARIO MANUAL CORREGIDO =================

function aplicarHorarioManual() {
    const h2Texto = document.getElementById("fechaSeleccionada").innerText;
    let fechaKey = null;

    if (h2Texto && h2Texto.includes("/")) {
        let partes = h2Texto.split("/");
        if(partes.length === 3) {
            fechaKey = `${partes[2]}-${partes[1].padStart(2,'0')}-${partes[0].padStart(2,'0')}`;
        }
    } else {
        fechaKey = h2Texto;
    }

    if (!fechaKey) {
        alert("Error al identificar la fecha seleccionada.");
        return;
    }

    let horaEntrada = document.getElementById("manualEntrada").value;
    let horaSalida = document.getElementById("manualSalida").value;
    
    if (!horaEntrada || !horaSalida) {
        alert("Por favor, introduce ambas horas.");
        return;
    }

    let datosDia = JSON.parse(localStorage.getItem(fechaKey)) || {};
    
    datosDia.tipo = document.getElementById("tipo").value;
    datosDia.nota = document.getElementById("notas").value;
    
    let [hE, mE] = horaEntrada.split(":").map(Number);
    let [hS, mS] = horaSalida.split(":").map(Number);
    
    let minutosEntrada = hE * 60 + mE;
    let minutosSalida = hS * 60 + mS;
    let minutosTotales = minutosSalida - minutosEntrada;
    
    if (minutosTotales < 0) {
        minutosTotales += 24 * 60; 
    }

    let horasRender = Math.floor(minutosTotales / 60);
    let minsRender = minutosTotales % 60;
    let textoHorasFormateado = `${horasRender}h ${String(minsRender).padStart(2, '0')}m`;

    // Sincronizamos la estructura tanto para datos directos como para el array de turnos
    datosDia.turnos = [{ entrada: horaEntrada, salida: horaSalida }]; 
    datosDia.entrada = horaEntrada;                                  
    datosDia.salida = horaSalida;                                    
    datosDia.horas = textoHorasFormateado;                           

    localStorage.setItem(fechaKey, JSON.stringify(datosDia));
    
    // 🛠️ CORREGIDO: Llama a la función unificada usando el ID real de tu div HTML
    actualizarBannerContador(minutosTotales / 60);

    // Refrescamos la vista general y cerramos
    generarCalendario(); 
    cerrar();
}

// ================= INICIALIZACIÓN DEL ENTORNO SEGURIZADO =================

generarCalendario();
guardarCopiaAutomatica();

if ("serviceWorker" in navigator) {
    const esLocal = window.location.hostname === "127.0.0.1" || window.location.hostname === "localhost";
    if (!esLocal) {
        navigator.serviceWorker.register("service-worker.js")
        .then(reg => {
            reg.onupdatefound = () => {
                const installingWorker = reg.installing;
                installingWorker.onstatechange = () => {
                    if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
                        window.location.reload();
                    }
                };
            };
        }).catch(err => console.log("Error SW:", err));
    }
}

// ================= MOTOR DE EXPORTACIÓN NATIVA A EXCEL (ANTI-ERRORES) =================

function exportarAExcel() {
    let claves = Object.keys(localStorage).filter(k => /^\d{4}-\d{2}-\d{2}$/.test(k));
    
    if (claves.length === 0) {
        alert("No hay registros de conducción guardados para exportar.");
        return;
    }

    // Ordenamos las fechas cronológicamente
    claves.sort((a, b) => new Date(a) - new Date(b));

    // Cabeceras del Excel estructurado
    let htmlTabla = `
        <table border="1">
            <tr style="background-color: #1e293b; color: #ffffff; font-weight: bold;">
                <th>Fecha</th>
                <th>Tipo de Jornada</th>
                <th>Total Horas</th>
                <th>Turno 1 (Entrada - Salida)</th>
                <th>Turno 2 (Entrada - Salida)</th>
                <th>Turno 3 (Entrada - Salida)</th>
                <th>Notas / Incidencias</th>
            </tr>
    `;

    claves.forEach(key => {
        let datos = JSON.parse(localStorage.getItem(key));
        if (!datos) return;

        // Formateamos la fecha a formato legible (DD/MM/YYYY)
        let [aaaa, mm, dd] = key.split("-");
        let fechaFormateada = `${dd}/${mm}/${aaaa}`;
        
        let tipoDia = datos.tipo ? datos.tipo.toUpperCase() : "NORMAL";
        let horasTotales = datos.horas || "0h 00m";
        let notaText = datos.nota || "";

        // Procesamos los sub-turnos (máximo 3 mapeados en columnas estables)
        let columnasTurnos = ["", "", ""];
        if (datos.turnos && datos.turnos.length) {
            datos.turnos.forEach((t, index) => {
                if (index < 3) {
                    let salidaText = t.salida || "Fichado Entrada (...)";
                    columnasTurnos[index] = `${t.entrada} a ${salidaText}`;
                }
            });
        } else if (datos.entrada) { 
            // Salvaguarda por si quedan registros antiguos sin array estructurado
            let salidaText = datos.salida || "(...)";
            columnasTurnos[0] = `${datos.entrada} a ${salidaText}`;
        }

        htmlTabla += `
            <tr>
                <td style="text-align: center;">${fechaFormateada}</td>
                <td style="text-align: center; font-weight: bold;">${tipoDia}</td>
                <td style="text-align: center; background-color: #f1f5f9;">${horasTotales}</td>
                <td style="text-align: center;">${columnasTurnos[0]}</td>
                <td style="text-align: center;">${columnasTurnos[1]}</td>
                <td style="text-align: center;">${columnasTurnos[2]}</td>
                <td>${notaText}</td>
            </tr>
        `;
    });

    htmlTabla += "</table>";

    // Generamos el Blob de datos simulando formato Excel XML seguro
    let excelTemplate = `
        <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
        <head><meta charset="UTF-8"></head>
        <body>${htmlTabla}</body>
        </html>
    `;

    let blob = new Blob([excelTemplate], { type: "application/vnd.ms-excel" });
    let linkDescarga = document.createElement("a");
    linkDescarga.href = URL.createObjectURL(blob);
    linkDescarga.download = `Historial_Conduccion_Bus_${new Date().getFullYear()}.xls`;
    
    document.body.appendChild(linkDescarga);
    linkDescarga.click();
    document.body.removeChild(linkDescarga);
}