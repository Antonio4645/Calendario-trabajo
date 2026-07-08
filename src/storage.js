export const getDatos = () => JSON.parse(localStorage.getItem("calendario_datos")) || {};
export const guardarDatos = (datos) => localStorage.setItem("calendario_datos", JSON.stringify(datos));
export const eliminarDatosDia = (fecha) => {
    let datos = getDatos();
    delete datos[fecha];
    guardarDatos(datos);
    return datos;
};

/**
 * Exporta el objeto completo a un archivo JSON
 */
export const exportarBackup = () => {
    const datos = getDatos();
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(datos));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", `backup_calendario_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
};

/**
 * Importa datos desde un archivo JSON externo
 */
export const importarBackup = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const contenido = JSON.parse(e.target.result);
            guardarDatos(contenido); // Sobrescribe el localStorage con el backup
            location.reload(); // Recargamos para refrescar toda la UI con los nuevos datos
        } catch (err) {
            console.error("Error al importar:", err);
            alert("El archivo seleccionado no es un backup válido.");
        }
    };
    reader.readAsText(file);
};