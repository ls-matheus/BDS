window.onload = () => {
  carregar('home');               // carrega o conteúdo do 'home' ao abrir
  marcarAtivo(document.querySelector('.lista li')); // marca o primeiro item ativo
};

function carregar(pagina) {
  fetch("Pages/" + pagina + ".html")
    .then(res => {
      if (!res.ok) throw new Error('Erro ao carregar');
      return res.text();
    })
    .then(data => {
      document.getElementById("content").innerHTML = data;
    })
    .catch(() => {
      document.getElementById("content").innerHTML = "<p>Conteúdo não encontrado.</p>";
    });
}

const listaItens = document.querySelectorAll('.lista li');

listaItens.forEach(item => {
  item.addEventListener('click', () => {
    marcarAtivo(item);
  });
});

function marcarAtivo(elemento) {
  listaItens.forEach(i => i.classList.remove('ativo'));
  elemento.classList.add('ativo');
}
