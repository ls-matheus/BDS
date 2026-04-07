const itens = document.querySelectorAll('.navbar .item');
const conteudo = document.getElementById('conteudo');
const logo = document.querySelector('.logo');
const mehImg = document.querySelector('.meh'); // pega a imagem

let paginaAtual = '';
let marcado = false;
let animando = false; // evita cliques múltiplos durante a animação

// Marca o item da navbar ativo (PC e mobile)
function marcarItemAtivo(pagina) {
  // Navbar PC
  itens.forEach(item => {
    const link = item.querySelector('a').getAttribute('data-page');
    if (link === pagina) item.classList.add('ativo');
    else item.classList.remove('ativo');
  });

  // Navbar mobile
  const itensM = document.querySelectorAll('.itemm');
  itensM.forEach(item => {
    const link = item.querySelector('a')?.getAttribute('data-page');
    if (link === pagina) item.classList.add('ativo');
    else item.classList.remove('ativo');
  });
}

// Carrega página com animação
function carregarPagina(pagina, clicouNaMesma = false) {
  // Bloqueia cliques durante animação (exceto toggle 3D na home)
  if (animando && !(pagina === 'home.html' && clicouNaMesma)) return;

  // Se for só ativar/desativar 3D na home
  if (pagina === 'home.html' && clicouNaMesma) {
    marcado = !marcado;
    logo.src = marcado ? 'assets/icons/25.svg' : 'assets/icons/24.svg';
    mehImg.style.display = marcado ? 'block' : 'none';
    return;
  }

  animando = true; // bloqueia cliques

  const novaPagina = document.createElement('div');
  novaPagina.classList.add('pagina');
  novaPagina.style.transform = 'translateY(110%)';
  novaPagina.style.width = '100%';
  novaPagina.style.height = '100%';

  fetch(`pages/${pagina}`)
    .then(res => res.text())
    .then(html => {
      novaPagina.innerHTML = html;
      conteudo.appendChild(novaPagina);

      // Força reflow para animação
      requestAnimationFrame(() => {
        novaPagina.style.transform = 'translateY(0)';
      });

      const paginas = conteudo.querySelectorAll('.pagina');
      if (paginas.length > 1) {
        const atual = paginas[paginas.length - 2];
        atual.style.transform = 'translateY(-100%)';
        setTimeout(() => {
          atual.remove();
          animando = false; // libera cliques depois da animação
        }, 800);
      } else {
        setTimeout(() => animando = false, 800);
      }

      paginaAtual = pagina;

      // Reseta logo e imagem
      logo.src = 'assets/icons/24.svg';
      mehImg.style.display = 'none';
      marcado = false;

      // Marca item ativo
      marcarItemAtivo(pagina);
    })
    .catch(() => {
      novaPagina.innerHTML = "<p>❌ Erro ao carregar a página.</p>";
      animando = false;
    });
}

// Eventos navbar PC
itens.forEach(item => {
  item.addEventListener('click', e => {
    e.preventDefault();
    const link = item.querySelector('a');
    carregarPagina(link.getAttribute('data-page'));
  });
});

// Eventos logo
logo.addEventListener('click', e => {
  e.preventDefault();
  if (paginaAtual !== 'home.html') {
    carregarPagina('home.html', false);
  } else {
    carregarPagina('home.html', true); // toggle 3D e imagem
  }
});

// Carrega home inicialmente
carregarPagina('home.html', false);

// Navbar mobile
const itensM = document.querySelectorAll('.itemm');
itensM.forEach(item => {
  item.addEventListener('click', e => {
    e.preventDefault();
    const link = item.querySelector('a');
    carregarPagina(link.getAttribute('data-page'));
  });
});
