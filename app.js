const calendar = document.getElementById("calendar");
const formulario = document.getElementById("formulario");
const fechaSeleccionada = document.getElementById("fechaSeleccionada");
const mesActualTexto = document.getElementById("mesActual");

let hoy = new Date();
let mes = hoy.getMonth();
let año = hoy.getFullYear();

let fechaActual = "";

const nombresMes = [
    "Enero","Febrero","Marzo","Abril","Mayo","Junio",
    "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"
];

// Generar calendario
function generarCalendario(){

    calendar.innerHTML="";

    mesActualTexto.innerText = nombresMes[mes] + " " + año;

    // días del mes
    let diasMes = new Date(año, mes + 1, 0).getDate();

    // día de la semana en que empieza el mes
    let primerDia = new Date(año, mes, 1).getDay();
    if(primerDia === 0) primerDia = 7;

    // espacios vacíos antes del primer día
    for(let i = 1; i < primerDia; i++){
        let vacio = document.createElement("div");
        calendar.appendChild(vacio);
    }

    // crear días del mes
    for(let i = 1; i <= diasMes; i++){

        let div = document.createElement("div");
        div.classList.add("day");

        // fecha interna (para localStorage)
        let fecha = `${año}-${mes+1}-${i}`;
        div.innerText = i;

        // comprobar si hay datos guardados
        let datos = JSON.parse(localStorage.getItem(fecha));
        if(datos){
            div.classList.add(datos.tipo);
        }

        // abrir formulario al hacer click
        div.onclick = ()=>{
            abrirFormulario(fecha);
        };

        calendar.appendChild(div);
    }
}

// Navegar a mes anterior
function mesAnterior(){
    mes--;
    if(mes < 0){
        mes = 11;
        año--;
    }
    generarCalendario();
}

// Navegar a mes siguiente
function mesSiguiente(){
    mes++;
    if(mes > 11){
        mes = 0;
        año++;
    }
    generarCalendario();
}

// Abrir formulario de un día
function abrirFormulario(fecha){
    fechaActual = fecha;
    formulario.classList.remove("hidden");

    // Formato español dd/mm/yyyy
    let partes = fecha.split("-");
    let dia = partes[2].padStart(2,'0');
    let mesStr = partes[1].padStart(2,'0');
    let fechaEs = `${dia}/${mesStr}/${partes[0]}`;
    fechaSeleccionada.innerText = fechaEs;

    // cargar datos si existen
    let datos = JSON.parse(localStorage.getItem(fecha));
    if(datos){
        document.getElementById("tipo").value = datos.tipo;
        document.getElementById("entrada").value = datos.entrada || "";
        document.getElementById("salida").value = datos.salida || "";
    } else {
        document.getElementById("tipo").value = "trabajo";
        document.getElementById("entrada").value = "";
        document.getElementById("salida").value = "";
    }
}

// Cerrar formulario
function cerrar(){
    formulario.classList.add("hidden");
}

// Guardar datos del día
function guardar(){
    let tipo = document.getElementById("tipo").value;
    let entrada = document.getElementById("entrada").value;
    let salida = document.getElementById("salida").value;

    let datos = {
        tipo:tipo,
        entrada:entrada,
        salida:salida
    };

    localStorage.setItem(fechaActual, JSON.stringify(datos));
    generarCalendario();
    cerrar();
}

// Eliminar un día
function eliminar(){
    localStorage.removeItem(fechaActual);
    generarCalendario();
    cerrar();
}

// Generar calendario al cargar
generarCalendario();