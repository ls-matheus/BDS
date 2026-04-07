// assets/Js/vibrate.js

// Seleciona todos os botões que têm a classe "item"
const buttons = document.querySelectorAll('.item');

buttons.forEach(button => {
  button.addEventListener('click', () => {
    if (navigator.vibrate) {
      navigator.vibrate(40); // vibra por 100ms
    }
  });
});
