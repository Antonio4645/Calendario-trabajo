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

// ------------------ Calendario ------------------
// ------------------ Calendario Actualizado ------------------
function generarCalendario(){
    calendar.innerHTML="";
    mesActualTexto.innerText = nombresMes[mes]+" "+año;

    let diasMes = new Date(año, mes+1,0).getDate();
    let primerDia = new Date(año, mes, 1).getDay();
    if(primerDia===0) primerDia=7;

    // Obtener la fecha de hoy real del sistema para compararla
    let objetoHoy = new Date();
    let fechaHoyReal = `${objetoHoy.getFullYear()}-${String(objetoHoy.getMonth()+1).padStart(2,'0')}-${String(objetoHoy.getDate()).padStart(2,'0')}`;

    for(let i=1;i<primerDia;i++) calendar.appendChild(document.createElement("div"));

    for(let i=1;i<=diasMes;i++){
        let div=document.createElement("div");
        div.classList.add("day");

        let fecha=`${año}-${String(mes+1).padStart(2,'0')}-${String(i).padStart(2,'0')}`;
        div.dataset.fecha = fecha;

        // MARCA DE HOY: Si la casilla coincide con el día de hoy real, le añadimos una clase CSS
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

            // INDICADOR DE NOTA: Si el día tiene una nota escrita y no está vacía, añadimos un puntito visual
            if(datos.nota && datos.nota.trim() !== "") {
                let dot = document.createElement("span");
                dot.classList.add("indicador-nota");
                dot.innerHTML = "✏️"; // Un mini lápiz elegante en la esquina
                div.appendChild(dot);
            }
        }

        // Para no borrar el lápiz si existía, creamos un contenedor para el texto del día
        let textoDia = document.createElement("span");
        textoDia.innerText = i + "\n" + letra;
        div.appendChild(textoDia);

        div.onclick=()=>abrirFormulario(fecha);
        calendar.appendChild(div);
    }
    mostrarResumen();
}

// ------------------ Formulario ------------------
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
                if(minutos < 0) minutos += 1440; // FIX TURNO NOCTURNO (Cruzar medianoche)

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

// ------------------ Fichar Entrada ------------------
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
    localStorage.setItem(fechaActual,JSON.stringify(datos));
    
    generarCalendario();
    abrirFormulario(fechaActual); // Recarga la lista en pantalla de manera fluida sin cerrar
}

// ------------------ Fichar Salida ------------------
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
            if(dif < 0) dif += 1440; // FIX TURNO NOCTURNO (Cruzar medianoche)
            totalMinutos += dif;
        }
    });
    let horas = Math.floor(totalMinutos/60);
    let minutos = totalMinutos % 60;
    datos.horas = `${horas}h ${minutos}m`;

    datos.nota = notasInput.value||"";
    localStorage.setItem(fechaActual,JSON.stringify(datos));
    generarCalendario();
    cerrar(); 
}

// ------------------ Guardar tipo ------------------
function guardarTipo(){
    let datos=JSON.parse(localStorage.getItem(fechaActual))||{};
    datos.tipo = tipoSelect.value;
    datos.nota = notasInput.value||"";
    localStorage.setItem(fechaActual,JSON.stringify(datos));
    generarCalendario();
    cerrar();
}

// ------------------ Mejora: Autocompletado de Jornada Urbana ------------------
function aplicarUrbanoAutomatico() {
    if (!fechaActual) return;

    // 1. Definimos el turno fijo de urbano (07:30 a 15:00)
    let turnoUrbano = {
        entrada: "07:30",
        salida: "15:00"
    };

    // 2. Estructuramos los datos del día directamente
    const datosDia = {
        tipo: "urbano", // Aplica el tipo urbano para que pinte el color gris slate corporativo
        nota: notasInput.value || "", // Preserva la nota si habías escrito algo antes
        turnos: [turnoUrbano],
        horas: "7h 30m" // Total de minutos calculado directamente (450 minutos)
    };

    // 3. Guardamos en el almacenamiento local, refrescamos el calendario y cerramos
    localStorage.setItem(fechaActual, JSON.stringify(datosDia));
    generarCalendario();
    cerrar();
}

// ------------------ Eliminar día ------------------
function eliminarDia(){
    localStorage.removeItem(fechaActual);
    generarCalendario();
    cerrar();
}

// ------------------ Navigation ------------------
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

// ------------------ Resumen ------------------
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
    
    // Primero renderizamos las tarjetas de los meses en su cuadrícula
    resumenDiv.innerHTML = html;

    // 🌟 ARREGLO MÓVIL: Buscamos si ya existe el botón en la página para no duplicarlo
    let botonExistente = document.getElementById("btnExportarExcel");
    if (botonExistente) botonExistente.remove();

    // Si hay datos guardados, creamos el botón FUERA de la cuadrícula conflictiva
    if(html !== "") {
        let contenedorBoton = document.createElement("div");
        contenedorBoton.id = "btnExportarExcel";
        contenedorBoton.style.cssText = "text-align: center; margin: 30px auto; width: 90%; max-width: 350px; clear: both;";
        
        contenedorBoton.innerHTML = `
            <button onclick="exportarAExcel()" style="
                width: 100%;
                background: #16a34a; 
                color: white; 
                border: none; 
                padding: 16px 20px; 
                font-size: 1.1em; 
                font-weight: bold; 
                border-radius: 12px; 
                cursor: pointer; 
                box-shadow: 0 4px 12px rgba(0,0,0,0.2);
                transition: background 0.2s;
                -webkit-appearance: none;">
                📥 Exportar Historial a Excel
            </button>`;
            
        // Insertamos el botón justo después del bloque de los meses, libre de problemas de rejilla
        resumenDiv.parentNode.insertBefore(contenedorBoton, resumenDiv.nextSibling);
    }
}

// 🌟 NUEVA FUNCIÓN: Genera y descarga el archivo Excel (CSV) compatible
function exportarAExcel() {
    let contenidoCSV = "Fecha;Tipo de Dia;Horas Totales;Turnos Fichados;Notas\n";
    
    let fechas = Object.keys(localStorage)
        .filter(key => /^\d{4}-\d{2}-\d{2}$/.test(key))
        .sort();

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

        let turnosTexto = "";
        if (datos.turnos && datos.turnos.length) {
            turnosTexto = datos.turnos.map(t => `${t.entrada || "..."}-${t.salida || "..."}`).join(" | ");
        } else {
            turnosTexto = "Sin turnos";
        }

        contenidoCSV += `${fecha};${tipo.toUpperCase()};${horas};${turnosTexto};${nota}\n`;
    });

    // Crear el archivo con cabecera UTF-8 BOM para que Excel abra las tildes y caracteres correctamente
    let blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), contenidoCSV], { type: "text/csv;charset=utf-8;" });
    let link = document.createElement("a");
    
    let url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `Historial_Fichajes_${new Date().getFullYear()}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// ------------------ Inicializar ------------------
generarCalendario();

// ------------------ Registro de Service Worker Inteligente ------------------
if ("serviceWorker" in navigator) {
    // Detectamos si estás en el ordenador (Live Server)
    const esLocal = window.location.hostname === "127.0.0.1" || window.location.hostname === "localhost";
    
    if (esLocal) {
        // SI ESTÁS EN EL PC: No registramos nada para que nunca más te dé error 404 ni congele los colores
        console.log("Modo desarrollo local activo: Service Worker desactivado para evitar caché.");
    } else {
        // SI ESTÁS EN GITHUB (INTERNET REAL): Aquí sí funciona perfecto
        navigator.serviceWorker.register("service-worker.js")
        .then(reg => {
            console.log("Service Worker registrado en producción:", reg.scope);
            reg.onupdatefound = () => {
                const installingWorker = reg.installing;
                installingWorker.onstatechange = () => {
                    if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
                        window.location.reload();
                    }
                };
            };
        })
        .catch(err => console.log("Error SW:", err));
    }
}