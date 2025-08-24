console.log("Nina PLUs PAint UI loaded");

// Gamepad placeholder
window.addEventListener("gamepadconnected", e => {
  console.log("Gamepad connected:", e.gamepad);
});

function pollGamepad() {
  const gp = navigator.getGamepads()[0];
  if (!gp) return;
  // W przyszłości można mapować A/X/LB/RB do narzędzi i rysowania
  requestAnimationFrame(pollGamepad);
}
pollGamepad();
