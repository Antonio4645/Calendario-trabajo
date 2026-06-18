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

        // 🌟 IDENTIFICACIÓN DE FINES DE SEMANA: Sábado (6) o Domingo (0)
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

        let textoDia = document.createElement("span");
        textoDia.innerText = i + "\n" + letra;
        div.appendChild(textoDia);

        div.onclick=()=>abrirFormulario(fecha);
        calendar.appendChild(div);
    }
    mostrarResumen();
}

// ------------------ Panel de Acciones (Formulario) ------------------
function abrirFormulario(fecha){
    fechaActual=fecha;
    formulario.classList.remove("hidden");

    let partes = fecha.split("-");
    fechaSeleccionada.innerText = `${partes[2]}/${partes[1]}/${partes[0]}`;

    let datos=JSON.parse(localStorage.getItem(fecha));
    tipoSelect.value=datos?datos.tipo:"normal";
    notasInput.value=datos?datos.nota||"":"";

    listaTurnos.innerHTML = "<strong>Turnos del día:</strong><br>";
    if(datos && datos.turnos && datos.turnos.length){
        datos.turnos.forEach((t,i)=>{
            if(t.entrada && t.salida){
                let [hE,mE] = t.entrada.split(":").map(Number);
                let [hS,mS] = t.salida.split(":").map(Number);
                
                let minutos = (hS*60+mS)-(hE*60+mE);
                if(minutos < 0) minutes += 1440; 

                let horas = Math.floor(minutos/60);
                let mins = minutos % 60;
                listaTurnos.innerHTML += `T${i+1}: ${t.entrada} - ${t.salida} (${horas}h ${mins}m)<br>`;
            } else if(t.entrada && !t.salida){
                listaTurnos.innerHTML += `T${i+1}: ${t.entrada} - ...<br>`;
            }
        });
    } else {
        listaTurnos.innerHTML += "No hay turnos fichados aún.";
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

// ------------------ Cálculos y Gestión de Resúmenes ------------------
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
        html += `<div class="mes-card">
            <h3>${mesNombre}</h3>
            <div class="dato"><span>Horas trabajadas:</span><span>${horasTotales}h ${minutosTotales}m</span></div>
            <div class="dato"><span>Días normales:</span><span>${d.normales}</span></div>
            <div class="dato"><span>Festivos trabajados:</span><span>${d.festivosTrab}</span></div>
            <div class="dato"><span>Vacaciones:</span><span>${d.vacaciones}</span></div>
            <div class="dato"><span>Trabajo urbano:</span><span>${d.urbanos}</span></div>
        </div>`;
    }
    
    resumenDiv.innerHTML = html;

    let botonExistente = document.getElementById("btnExportarExcel");
    if (botonExistente) botonExistente.remove();

    if(html !== "") {
        let contenedorBoton = document.createElement("div");
        contenedorBoton.id = "btnExportarExcel";
        contenedorBoton.style.cssText = "text-align: center; margin: 30px auto; width: 90%; max-width: 400px; display: flex; flex-direction: column; gap: 12px; clear: both;";
        
        // 🌟 'appearance: none;' define el estándar y '-webkit-appearance' asegura compatibilidad con motores WebKit
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

function exportarAExcel() {
    let contenidoCSV = "Fecha;Tipo de Dia;Horas Totales;Turnos Fichados;Notas\n";
    let fechas = Object.keys(localStorage).filter(key => /^\d{4}-\d{2}-\d{2}$/.test(key)).sort();

    if (fechas.length === 0) {
        alert("No tienes ningún dato registrado para exportar todavía.");
        return;
    }

    fechas.forEach(fecha => {
        let datos = JSON.parse(localStorage.getItem(fecha));
        if (!datos) return;

        let tipo = datos.tipo || "normal";
        let horas = datos.horas || "0h 0m";
        let nota = datos.nota ? datos.nota.replace(/[\n\r;]/g, " ") : "";

        let turnosTexto = datos.turnos && datos.turnos.length ? 
            datos.turnos.map(t => `${t.entrada || "..."}-${t.salida || "..."}`).join(" | ") : "Sin turnos";

        contenidoCSV += `${fecha};${tipo.toUpperCase()};${horas};${turnosTexto};${nota}\n`;
    });

    let blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), contenidoCSV], { type: "text/csv;charset=utf-8;" });
    let link = document.createElement("a");
    link.setAttribute("href", URL.createObjectURL(blob));
    link.setAttribute("download", `Historial_Fichajes_${new Date().getFullYear()}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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

// Vinculamos directamente al contenedor del calendario para no interferir en el formulario inferior
calendar.addEventListener('touchstart', (e) => {
    toqueInicioX = e.changedTouches[0].screenX;
    toqueInicioY = e.changedTouches[0].screenY;
}, { passive: true });

calendar.addEventListener('touchmove', (e) => {
    let difX = Math.abs(e.changedTouches[0].screenX - toqueInicioX);
    let difY = Math.abs(e.changedTouches[0].screenY - toqueInicioY);
    
    // Si la inclinación del gesto es marcadamente horizontal, bloqueamos la acción nativa del navegador
    if (difX > difY && difX > 10) {
        if (e.cancelable) e.preventDefault(); 
    }
}, { passive: false }); // Físicamente necesario pasarle 'passive: false' para poder abortar la navegación nativa

calendar.addEventListener('touchend', (e) => {
    let toqueFinX = e.changedTouches[0].screenX;
    let toqueFinY = e.changedTouches[0].screenY;
    
    let distanciaX = toqueFinX - toqueInicioX;
    let distanciaY = toqueFinY - toqueInicioY;
    
    const umbralMinimo = 60; // Sensibilidad calibrada para pantallas móviles
    
    // Verificamos que sea un deslizamiento intencionado de izquierda/derecha y no arriba/abajo
    if (Math.abs(distanciaX) > Math.abs(distanciaY) && Math.abs(distanciaX) > umbralMinimo) {
        if (distanciaX < 0) {
            mesSiguiente();
        } else {
            mesAnterior();
        }
    }
}, { passive: true });

// ================= INICIALIZACIÓN DEL ENTORNO SEGURIZADO =================

generarCalendario();
guardarCopiaAutomatica(); // Captura limpia del estado al arrancar la app

// ------------------ Service Worker (PWA) ------------------
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