// Seleciona o item clicado e sincroniza navbars
function selecionar(elem) {
  const pagina = elem.getAttribute('data-pagina');

  // Remove 'ativo' de todos os itens em ambas navbars
  document.querySelectorAll('.navbar-top .item, .navbar .item').forEach(i => i.classList.remove('ativo'));

  // Ativa os itens com mesmo data-pagina nas duas navbars
  document.querySelectorAll(`.item[data-pagina="${pagina}"]`).forEach(i => i.classList.add('ativo'));

  mudarConteudo(pagina);
}

// Carrega o conteúdo da página usando fetch
function mudarConteudo(pagina) {
  const divConteudo = document.querySelector('.conteudo');
  fetch(`Pages/${pagina}.html`)
    .then(res => {
      if (!res.ok) throw new Error('Erro ao carregar a página');
      return res.text();
    })
    .then(html => {
      divConteudo.innerHTML = html;
    })
    .catch(err => {
      divConteudo.innerHTML = `<center><h1>404</h1><p>Não foi possível carregar a página.</p></center>`;
      console.error(err);
    });
}

// Inicializa carregando a home
document.addEventListener('DOMContentLoaded', () => {
  selecionar(document.querySelector('.item[data-pagina="home"]'));
});

