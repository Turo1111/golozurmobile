export const useDate = (dateConvert) => {
    const fecha = dateConvert ? new Date(dateConvert) : new Date();

    // Obtener componentes de la fecha
    const dia = fecha.getDate().toString().padStart(2, '0'); // Agregar cero inicial si es necesario
    const mes = (fecha.getMonth() + 1).toString().padStart(2, '0'); // Los meses comienzan en 0
    const anio = fecha.getFullYear();
    const horas = fecha.getHours().toString().padStart(2, '0');
    const minutos = fecha.getMinutes().toString().padStart(2, '0');
    const segundos = fecha.getSeconds().toString().padStart(2, '0');
    const ampm = horas >= 12 ? 'PM' : 'AM';
    const zonaHoraria = 'GMT-3';

    // Formatear la fecha en tu formato personalizado
    const fechaFormateada = `${mes}/${dia}/${anio}, ${horas}:${minutos}:${segundos}`;

    return  {date: fechaFormateada} ;
};