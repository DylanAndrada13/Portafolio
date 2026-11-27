/** Estado que animan la intro y la app (GSAP escribe acá; el loop lo lee). */
export function createSceneState() {
  return {
    reveal: 0, // oscuridad -> escena
    power: 0, // pantallas
    led: 0, // tiras LED
    flash: 0, // relámpago
    zoom: 1.2, // zoom de cámara (1 = encuadre "cover" justo)
    motion: 0, // intensidad del parallax / deriva
    torch: 0, // linterna del puntero
    lamp: 0, // lámpara del techo (arranca apagada)
    theme: 0, // 0 azul tranquilo -> 1 rojo (sigue a la lámpara)
    rgb: 0, // modo RGB
    whiteout: 0, // fundido al entrar a una pantalla
    entered: 0, // 1 cuando el visitante entra a la habitación desde el inicio
    focusMix: 0, // 0 cámara libre -> 1 cámara apuntando a focusX/focusY
    focusX: 960,
    focusY: 540,
  };
}
