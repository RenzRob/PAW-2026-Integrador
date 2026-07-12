const XP_POR_PUESTO = { 1: 150, 2: 75, 3: 40, 4: 15 };

function xpParaPuesto(puesto) {
  return XP_POR_PUESTO[puesto] ?? 0;
}

// Progresión cuadrática: nivel n requiere 100*n*(n-1)/2 XP acumulados
// => nivel = floor( (1 + sqrt(1 + 8*xp/100)) / 2 )
function calcularNivel(xpTotal) {
  if (xpTotal <= 0) return 1;
  return Math.max(1, Math.floor((1 + Math.sqrt(1 + (8 * xpTotal) / 100)) / 2));
}

// XP acumulada necesaria para alcanzar el nivel n
function xpParaNivel(n) {
  if (n <= 1) return 0;
  return Math.floor((100 * (n - 1) * n) / 2);
}

// XP que falta para subir del nivel actual al siguiente
function xpParaSiguienteNivel(nivelActual, xpActual) {
  return xpParaNivel(nivelActual + 1) - xpActual;
}

// XP que el jugador tiene dentro del nivel actual (para la barra de progreso)
function xpEnNivelActual(nivelActual, xpActual) {
  return xpActual - xpParaNivel(nivelActual);
}

// XP total necesaria para completar el nivel actual (de inicio a fin del nivel)
function xpTotalDelNivel(nivelActual) {
  return xpParaNivel(nivelActual + 1) - xpParaNivel(nivelActual);
}

module.exports = {
  xpParaPuesto,
  calcularNivel,
  xpParaNivel,
  xpParaSiguienteNivel,
  xpEnNivelActual,
  xpTotalDelNivel,
};
