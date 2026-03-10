const calendar = document.getElementById("calendar");
const mesActualTexto = document.getElementById("mesActual");
const formulario = document.getElementById("formulario");
const fechaSeleccionada = document.getElementById("fechaSeleccionada");
const tipoSelect = document.getElementById("tipo");
const resumenDiv = document.getElementById("resumen");

let hoy = new Date();
let mes = hoy.getMonth();
let año = hoy.getFullYear();
let fechaActual = "";

const nombresMes = ["Enero","Febrero","Marzo","Abril","Mayo","Junio",
    "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];

// ------------------ Calendario ------------------
function generarCalendario(){
    calendar.innerHTML="";
    mesActualTexto.innerText = nombresMes[mes] + " " + año;

    let diasMes = new Date(año, mes+1,0).getDate();
    let primerDia = new Date(año, mes, 1).getDay();
    if(primerDia === 0) primerDia = 7; // domingo como 7

    // espacios vacíos antes del primer día
    for(let i=1; i<primerDia; i++) calendar.appendChild(document.createElement("div"));

    for(let i=1; i<=diasMes; i++){
        let div = document.createElement("div");
        div.classList.add("day");

        // 🔹 Fecha siempre con dos dígitos para evitar errores en móviles
        let fecha = `${año}-${String(mes+1).padStart(2,'0')}-${String(i).padStart(2,'0')}`;
        div.dataset.fecha = fecha;

        let datos = JSON.parse(localStorage.getItem(fecha));
        let letra = "";
        if(datos){
            div.classList.add(datos.tipo);
            letra = datos.tipo === "normal" ? "T" :
                    datos.tipo === "vacaciones" ? "V" :
                    datos.tipo === "festivo" ? "F" :
                    datos.tipo === "festivo-trabajado" ? "FT" : "";
            if(datos.entrada && datos.salida){
                letra += " (" + datos.horas.toFixed(2) + "h)";
            }
        }

        div.innerText = i + "\n" + letra;
        div.onclick = ()=> abrirFormulario(fecha);
        calendar.appendChild(div);
    }

    mostrarResumen();
}

// ------------------ Formulario ------------------
function abrirFormulario(fecha){
    fechaActual = fecha;
    formulario.classList.remove("hidden");

    let partes = fecha.split("-");
    fechaSeleccionada.innerText = `${partes[2]}/${partes[1]}/${partes[0]}`;

    let datos = JSON.parse(localStorage.getItem(fecha));
    tipoSelect.value = datos ? datos.tipo : "normal";
}

function cerrar(){ formulario.classList.add("hidden"); }

function ficharEntrada(){
    let datos = JSON.parse(localStorage.getItem(fechaActual)) || {};
    if(!datos.entrada){
        let now = new Date();
        datos.entrada = now.toLocaleTimeString('es-ES', {hour:'2-digit', minute:'2-digit'});
        datos.tipo = datos.tipo || "normal";
        localStorage.setItem(fechaActual, JSON.stringify(datos));
        generarCalendario();
        mostrarResumen();
        cerrar();
    } else {
        alert("Ya has fichado la entrada de este día");
    }
}

function ficharSalida(){
    let datos = JSON.parse(localStorage.getItem(fechaActual)) || {};
    if(!datos.entrada){
        alert("Primero debes fichar la entrada");
        return;
    }
    if(!datos.salida){
        let now = new Date();
        datos.salida = now.toLocaleTimeString('es-ES', {hour:'2-digit', minute:'2-digit'});
        let [hE,mE] = datos.entrada.split(":");
        let [hS,mS] = datos.salida.split(":");
        let horas = (parseInt(hS)*60 + parseInt(mS) - (parseInt(hE)*60 + parseInt(mE)))/60;
        datos.horas = horas;
        localStorage.setItem(fechaActual, JSON.stringify(datos));
        generarCalendario();
        mostrarResumen();
        cerrar();
    } else {
        alert("Ya has fichado la salida de este día");
    }
}

function guardarTipo(){
    let datos = JSON.parse(localStorage.getItem(fechaActual)) || {};
    datos.tipo = tipoSelect.value;
    localStorage.setItem(fechaActual, JSON.stringify(datos));
    generarCalendario();
    mostrarResumen();
    cerrar();
}

function eliminarDia(){
    localStorage.removeItem(fechaActual);
    generarCalendario();
    mostrarResumen();
    cerrar();
}

// ------------------ Navegación ------------------
function mesAnterior(){ mes--; if(mes<0){ mes=11; año--; } generarCalendario(); }
function mesSiguiente(){ mes++; if(mes>11){ mes=0; año++; } generarCalendario(); }

// ------------------ Resumen ------------------
function calcularResumen(){
    let resumen = {};
    for(let key in localStorage){
        try{
            let datos = JSON.parse(localStorage.getItem(key));
            if(!datos) continue;
            let [year, month] = key.split("-");
            let keyMes = `${year}-${month}`;
            if(!resumen[keyMes]) resumen[keyMes] = {horas:0, normales:0, festivosTrab:0, vacaciones:0};

            if(datos.horas) resumen[keyMes].horas += datos.horas;
            if(datos.tipo==="normal") resumen[keyMes].normales +=1;
            if(datos.tipo==="festivo-trabajado") resumen[keyMes].festivosTrab +=1;
            if(datos.tipo==="vacaciones") resumen[keyMes].vacaciones +=1;
        } catch(e){}
    }
    return resumen;
}

function mostrarResumen(){
    const resumen = calcularResumen();
    let html = "";
    for(let mesKey in resumen){
        const mesData = resumen[mesKey];
        let [year, month] = mesKey.split("-");
        let mesNombre = nombresMes[parseInt(month)-1] + " " + year;

        html += `<div class="mes-card">
                    <h3>${mesNombre}</h3>
                    <div class="dato horas"><span>Horas trabajadas:</span> <span>${mesData.horas.toFixed(2)} h</span></div>
                    <div class="dato normales"><span>Días normales:</span> <span>${mesData.normales}</span></div>
                    <div class="dato festivos"><span>Festivos trabajados:</span> <span>${mesData.festivosTrab}</span></div>
                    <div class="dato vacaciones"><span>Vacaciones:</span> <span>${mesData.vacaciones}</span></div>
                 </div>`;
    }
    resumenDiv.innerHTML = html;
}

// ------------------ Inicializar ------------------
generarCalendario();

if("serviceWorker" in navigator){
    navigator.serviceWorker.register("service-worker.js")
    .then(()=>console.log("Service Worker registrado"))
    .catch(err=>console.log("Error SW:", err));
}