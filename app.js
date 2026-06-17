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
            // Horas totales del día
            if(datos.horas) letra+=" ("+datos.horas+")";
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

    // Mostrar detalle de turnos
    let turnosDetalle = document.getElementById("turnosDetalle");
    if(!turnosDetalle){
        turnosDetalle = document.createElement("div");
        turnosDetalle.id = "turnosDetalle";
        turnosDetalle.style.marginTop = "10px";
        turnosDetalle.style.fontSize = "1em";
        turnosDetalle.style.color = "#f8f7f7";
        formulario.appendChild(turnosDetalle);
    }

    turnosDetalle.innerHTML = "<strong>Turnos del día:</strong><br>";
    if(datos && datos.turnos && datos.turnos.length){
        datos.turnos.forEach((t,i)=>{
            if(t.entrada && t.salida){
                // Calcular horas del turno
                let [hE,mE] = t.entrada.split(":").map(Number);
                let [hS,mS] = t.salida.split(":").map(Number);
                let minutos = (hS*60+mS)-(hE*60+mE);
                let horas = Math.floor(minutos/60);
                let mins = minutos % 60;
                turnosDetalle.innerHTML += `T${i+1}: ${t.entrada} - ${t.salida} (${horas}h ${mins}m)<br>`;
            } else if(t.entrada && !t.salida){
                turnosDetalle.innerHTML += `T${i+1}: ${t.entrada} - ...<br>`;
            }
        });
    } else {
        turnosDetalle.innerHTML += "No hay turnos fichados aún.";
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
    cerrar(); // cierra el formulario al fichar
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

    // Calcular horas totales del día
    let totalMinutos = 0;
    datos.turnos.forEach(turno=>{
        if(turno.entrada && turno.salida){
            let [hE,mE] = turno.entrada.split(":").map(Number);
            let [hS,mS] = turno.salida.split(":").map(Number);
            totalMinutos += (hS*60+mS)-(hE*60+mE);
        }
    });
    let horas = Math.floor(totalMinutos/60);
    let minutos = totalMinutos % 60;
    datos.horas = `${horas}h ${minutos}m`;

    datos.nota = notasInput.value||"";
    localStorage.setItem(fechaActual,JSON.stringify(datos));
    generarCalendario();
    cerrar(); // cierra el formulario al fichar
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

// ------------------ Eliminar día ------------------
function eliminarDia(){
    localStorage.removeItem(fechaActual);
    generarCalendario();
    cerrar();
}

// ------------------ Navegación ------------------
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
    resumenDiv.innerHTML = html;
}

// ------------------ Inicializar ------------------
generarCalendario();

if("serviceWorker" in navigator){
    navigator.serviceWorker.register("service-worker.js")
    .then(()=>console.log("Service Worker registrado"))
    .catch(err=>console.log("Error SW:",err));
}