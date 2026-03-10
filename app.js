const calendar = document.getElementById("calendar");
const mesActualTexto = document.getElementById("mesActual");
const formulario = document.getElementById("formulario");
const fechaSeleccionada = document.getElementById("fechaSeleccionada");
const tipoSelect = document.getElementById("tipo");
const resumenDiv = document.getElementById("resumen");
const notasInput = document.getElementById("notas");

let hoy = new Date();
let mes = hoy.getMonth();
let año = hoy.getFullYear();
let fechaActual = "";

// Nombres de meses
const nombresMes = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];

// ------------------ Calendario ------------------
function generarCalendario(){
    calendar.innerHTML="";
    mesActualTexto.innerText = nombresMes[mes]+" "+año;

    let diasMes = new Date(año, mes+1,0).getDate();
    let primerDia = new Date(año, mes, 1).getDay();
    if(primerDia===0) primerDia=7;

    for(let i=1;i<primerDia;i++) calendar.appendChild(document.createElement("div"));

    for(let i=1;i<=diasMes;i++){
        let div=document.createElement("div");
        div.classList.add("day");

        let fecha=`${año}-${String(mes+1).padStart(2,'0')}-${String(i).padStart(2,'0')}`;
        div.dataset.fecha = fecha;

        let datos = JSON.parse(localStorage.getItem(fecha));
        let letra="";
        if(datos){
            div.classList.add(datos.tipo);
            letra = datos.tipo==="normal"?"T":
                    datos.tipo==="vacaciones"?"V":
                    datos.tipo==="festivo"?"F":
                    datos.tipo==="festivo-trabajado"?"FT":
                    datos.tipo==="urbano"?"TU":"";
            if(datos.entrada && datos.salida && datos.horas) letra+=" ("+datos.horas+")";
        }

        div.innerText=i+"\n"+letra;
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
}

function cerrar(){ formulario.classList.add("hidden"); }

function ficharEntrada(){
    let datos=JSON.parse(localStorage.getItem(fechaActual))||{};
    if(!datos.entrada){
        let now=new Date();
        datos.entrada = now.toLocaleTimeString('es-ES',{hour:'2-digit',minute:'2-digit'});
        datos.tipo = datos.tipo||"normal";
        datos.nota = notasInput.value||"";
        localStorage.setItem(fechaActual,JSON.stringify(datos));
        generarCalendario(); cerrar();
    }else alert("Ya has fichado la entrada");
}

function ficharSalida(){
    let datos=JSON.parse(localStorage.getItem(fechaActual))||{};
    if(!datos.entrada){ alert("Primero debes fichar la entrada"); return; }
    if(!datos.salida){
        let now=new Date();
        datos.salida = now.toLocaleTimeString('es-ES',{hour:'2-digit',minute:'2-digit'});

        // Calcular horas literales
        let [hE,mE] = datos.entrada.split(":").map(Number);
        let [hS,mS] = datos.salida.split(":").map(Number);
        let totalMinutos = (hS*60 + mS) - (hE*60 + mE);
        let horas = Math.floor(totalMinutos/60);
        let minutos = totalMinutos % 60;
        datos.horas = `${horas}h ${minutos}m`;

        datos.nota = notasInput.value||"";
        localStorage.setItem(fechaActual,JSON.stringify(datos));
        generarCalendario(); cerrar();
    } else alert("Ya has fichado la salida");
}

function guardarTipo(){
    let datos=JSON.parse(localStorage.getItem(fechaActual))||{};
    datos.tipo = tipoSelect.value;
    datos.nota = notasInput.value||"";
    localStorage.setItem(fechaActual,JSON.stringify(datos));
    generarCalendario(); cerrar();
}

function eliminarDia(){
    localStorage.removeItem(fechaActual);
    generarCalendario(); cerrar();
}

// ------------------ Navegación ------------------
function mesAnterior(){ mes--; if(mes<0){mes=11;año--;} generarCalendario(); }
function mesSiguiente(){ mes++; if(mes>11){mes=0;año++;} generarCalendario(); }

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
            // Convertir "Xh Ym" a minutos
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

        // Convertir minutos a horas y minutos
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
}

// ------------------ Inicializar ------------------
generarCalendario();

if("serviceWorker" in navigator){
    navigator.serviceWorker.register("service-worker.js")
    .then(()=>console.log("Service Worker registrado"))
    .catch(err=>console.log("Error SW:",err));
}