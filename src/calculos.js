export function calcularHorasEntreFichajes(h1, h2) {
    if (!h1 || !h2) return 0;
    let [arrH1, arrM1] = h1.split(":").map(Number);
    let [arrH2, arrM2] = h2.split(":").map(Number);
    let m1 = arrH1 * 60 + arrM1;
    let m2 = arrH2 * 60 + arrM2;
    if (m2 < m1) m2 += 24 * 60;
    return (m2 - m1) / 60;
}

export function decimalAHora(decimal) {
    if (isNaN(decimal) || decimal === 0) return "0:00";
    let horas = Math.floor(decimal);
    let minutos = Math.round((decimal - horas) * 60);
    return `${horas}:${minutos.toString().padStart(2, "0")}h`;
}

export function parsearFechaAString(d) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}