const contextLabels = {
    dashboard: "Dashboard",
    figma: "Figma",
    spotify: "Spotify",
    youtube: "YouTube"
};

const embedContexts = {
    figma: {
        path: "Integracoes",
        src: "https://www.figma.com/embed?embed_host=share&url=https://www.figma.com/community/file/1087677032259208498"
    },
    spotify: {
        path: "Integracoes",
        src: "https://open.spotify.com/embed/playlist/37i9dQZF1DXcBWIGoYBM5M?utm_source=generator"
    },
    youtube: {
        path: "Integracoes",
        src: "https://www.youtube.com/embed/jfKfPfyJRdk"
    }
};

const viewConfig = {
    painel: {
        path: "Organizacao",
        render: (contextName) => ({ type: "template", id: "view-painel-template", contextName })
    },
    agenda: {
        path: "Agenda",
        render: (contextName) => ({
            type: "html",
            html: `
                <div class="title-row">
                    <div>
                        <h1>Agenda da semana</h1>
                        <p>Visao de horarios, checkpoints e entregas para ${contextName.toLowerCase()}.</p>
                    </div>
                </div>
                <section class="panel-grid">
                    <article class="list-card">
                        <h3>Hoje</h3>
                        <ul class="list">
                            <li><span>10:00 | Daily com squad</span><span class="badge">15 min</span></li>
                            <li><span>14:30 | Revisao de copy</span><span class="badge">45 min</span></li>
                            <li><span>17:00 | Atualizar kanban</span><span class="badge">20 min</span></li>
                        </ul>
                    </article>
                    <article class="list-card">
                        <h3>Proximos 3 dias</h3>
                        <ul class="list">
                            <li><span>Ter | Mentoria tecnica</span><span class="badge">Alta</span></li>
                            <li><span>Qua | Entrega de relatorio</span><span class="badge">Prazo</span></li>
                            <li><span>Qui | Reuniao 1:1</span><span class="badge">Pessoal</span></li>
                        </ul>
                    </article>
                </section>
            `
        })
    },
    trilha: {
        path: "Desenvolvimento",
        render: (contextName) => ({
            type: "html",
            html: `
                <div class="title-row">
                    <div>
                        <h1>Trilha de desenvolvimento</h1>
                        <p>Plano de aprendizagem ativo para ${contextName.toLowerCase()}.</p>
                    </div>
                </div>
                <section class="metrics">
                    <article class="metric-card clickable" data-action="Modulo onboarding concluido">
                        <div class="metric-head"><h3>Onboarding</h3><span class="badge">Concluido</span></div>
                        <div class="metric-foot"><span>Atividades</span><strong>6/6</strong></div>
                        <div class="bar"><span class="mint"></span></div>
                    </article>
                    <article class="metric-card clickable" data-action="Modulo produtividade em andamento">
                        <div class="metric-head"><h3>Produtividade</h3><span class="badge">Em curso</span></div>
                        <div class="metric-foot"><span>Atividades</span><strong>4/7</strong></div>
                        <div class="bar"><span class="yellow"></span></div>
                    </article>
                    <article class="metric-card clickable" data-action="Modulo comunicacao planejado">
                        <div class="metric-head"><h3>Comunicacao</h3><span class="badge">Planejado</span></div>
                        <div class="metric-foot"><span>Atividades</span><strong>0/5</strong></div>
                        <div class="bar"><span class="purple"></span></div>
                    </article>
                </section>
            `
        })
    },
    comunicacao: {
        path: "Comunicacao",
        render: () => ({
            type: "html",
            html: `
                <div class="title-row">
                    <div>
                        <h1>Canal de comunicacao</h1>
                        <p>Central de recados, alinhamentos rapidos e encaminhamento de bloqueios.</p>
                    </div>
                </div>
                <section class="panel-grid">
                    <article class="list-card">
                        <h3>Recados da lideranca</h3>
                        <ul class="list">
                            <li><span>Atualizar pauta de sprint ate sexta</span><span class="badge">Novo</span></li>
                            <li><span>Padrao de relatorio mensal publicado</span><span class="badge">Importante</span></li>
                        </ul>
                    </article>
                    <article class="list-card">
                        <h3>Bloqueios reportados</h3>
                        <ul class="list">
                            <li><span>Acesso ao dashboard de vendas</span><button class="link-like" data-action="Bloqueio marcado para suporte">Encaminhar</button></li>
                            <li><span>Validacao do calendario editorial</span><button class="link-like" data-action="Bloqueio enviado ao mentor">Escalar</button></li>
                        </ul>
                    </article>
                </section>
            `
        })
    },
    biblioteca: {
        path: "Materiais",
        render: () => ({
            type: "html",
            html: `
                <div class="title-row">
                    <div>
                        <h1>Biblioteca de apoio</h1>
                        <p>Documentacao, playbooks e modelos prontos para acelerar sua rotina.</p>
                    </div>
                </div>
                <section class="panel-grid">
                    <article class="list-card">
                        <h3>Guias recomendados</h3>
                        <ul class="list">
                            <li><span>Checklist de entrega semanal</span><button class="link-like" data-action="Checklist aberto">Abrir</button></li>
                            <li><span>Template de ata de reuniao</span><button class="link-like" data-action="Template carregado">Usar</button></li>
                            <li><span>Guia de feedback objetivo</span><button class="link-like" data-action="Guia aberto">Ler</button></li>
                        </ul>
                    </article>
                    <article class="list-card">
                        <h3>Ultimos acessos</h3>
                        <ul class="list">
                            <li><span>Manual de onboarding</span><span class="badge">ontem</span></li>
                            <li><span>Playbook de comunicacao</span><span class="badge">hoje</span></li>
                            <li><span>Modelo de cronograma</span><span class="badge">hoje</span></li>
                        </ul>
                    </article>
                </section>
            `
        })
    },
    mensagens: {
        path: "Mensagens",
        render: () => ({
            type: "html",
            html: `
                <div class="title-row">
                    <div>
                        <h1>Caixa de mensagens</h1>
                        <p>Resumo de conversas com mentor, RH e equipe para nao perder contexto.</p>
                    </div>
                </div>
                <section class="list-card">
                    <ul class="list">
                        <li><span><strong>Mentor:</strong> revisei seu plano, ficou bom.</span><span class="badge">09:42</span></li>
                        <li><span><strong>RH:</strong> lembrete de registro de horas.</span><span class="badge">08:15</span></li>
                        <li><span><strong>Equipe:</strong> aprovamos sua proposta de pauta.</span><span class="badge">ontem</span></li>
                    </ul>
                </section>
            `
        })
    },
    relatorios: {
        path: "Indicadores",
        render: () => ({
            type: "html",
            html: `
                <div class="title-row">
                    <div>
                        <h1>Relatorios de desempenho</h1>
                        <p>Indicadores de produtividade, entregas no prazo e evolucao semanal.</p>
                    </div>
                </div>
                <section class="stats">
                    <article class="stat-box lavender clickable" data-action="Acuracia das entregas: 92%"><strong>92%</strong><span>Entregas no prazo</span></article>
                    <article class="stat-box peach clickable" data-action="Tempo medio de resposta: 36 min"><strong>36m</strong><span>Tempo de resposta</span></article>
                    <article class="stat-box sand clickable" data-action="Satisfacao do mentor: 4.8"><strong>4.8</strong><span>Nota de mentoria</span></article>
                </section>
            `
        })
    },
    automacoes: {
        path: "Automacoes",
        render: () => ({
            type: "html",
            html: `
                <div class="title-row">
                    <div>
                        <h1>Automacoes pessoais</h1>
                        <p>Rotinas automatizadas para reduzir tarefas repetitivas no dia a dia.</p>
                    </div>
                </div>
                <section class="list-card">
                    <ul class="list">
                        <li><span>Lembrete diario de prioridades</span><button class="link-like" data-action="Lembrete diario ativado">Ativar</button></li>
                        <li><span>Resumo semanal por e-mail</span><button class="link-like" data-action="Resumo semanal configurado">Configurar</button></li>
                        <li><span>Checklist pos-reuniao 1:1</span><button class="link-like" data-action="Checklist automatico habilitado">Habilitar</button></li>
                    </ul>
                </section>
            `
        })
    },
    empresa: {
        path: "Empresa",
        render: () => ({
            type: "html",
            html: `
                <div class="title-row">
                    <div>
                        <h1>Diretrizes da empresa</h1>
                        <p>Politicas, cultura e orientacoes para apoiar seu desenvolvimento.</p>
                    </div>
                </div>
                <section class="panel-grid">
                    <article class="list-card">
                        <h3>Politicas principais</h3>
                        <ul class="list">
                            <li><span>Registro de horas ate sexta 18h</span><span class="badge">Obrigatorio</span></li>
                            <li><span>Feedback quinzenal com mentor</span><span class="badge">Recorrente</span></li>
                        </ul>
                    </article>
                    <article class="list-card">
                        <h3>Contatos uteis</h3>
                        <ul class="list">
                            <li><span>RH | rh@efetiva.com</span><button class="link-like" data-action="Contato de RH copiado">Copiar</button></li>
                            <li><span>Suporte | suporte@efetiva.com</span><button class="link-like" data-action="Contato de suporte copiado">Copiar</button></li>
                        </ul>
                    </article>
                </section>
            `
        })
    },
    calendario: {
        path: "Planejamento",
        render: () => ({
            type: "html",
            html: `
                <div class="title-row">
                    <div>
                        <h1>Planejamento mensal</h1>
                        <p>Marcos importantes do mes e distribuicao de foco por semana.</p>
                    </div>
                </div>
                <section class="panel-grid">
                    <article class="list-card">
                        <h3>Semana 1</h3>
                        <ul class="list">
                            <li><span>Onboarding + alinhamento de metas</span><span class="badge">Concluir</span></li>
                            <li><span>Mapear tarefas de impacto</span><span class="badge">Prioridade</span></li>
                        </ul>
                    </article>
                    <article class="list-card">
                        <h3>Semana 2</h3>
                        <ul class="list">
                            <li><span>Entregar relatorio parcial</span><span class="badge">Prazo</span></li>
                            <li><span>Apresentar melhoria de processo</span><span class="badge">Objetivo</span></li>
                        </ul>
                    </article>
                </section>
            `
        })
    },
    configuracoes: {
        path: "Preferencias",
        render: () => ({
            type: "html",
            html: `
                <div class="title-row">
                    <div>
                        <h1>Configuracoes do painel</h1>
                        <p>Ajuste preferencias de notificacao, foco e acompanhamento de desempenho.</p>
                    </div>
                </div>
                <section class="list-card">
                    <ul class="list">
                        <li><span>Notificacao de prazo critico</span><button class="link-like" data-action="Notificacao de prazo ativada">Ativar</button></li>
                        <li><span>Resumo diario no inicio da manha</span><button class="link-like" data-action="Resumo diario habilitado">Ativar</button></li>
                        <li><span>Modo foco para blocos de 50 minutos</span><button class="link-like" data-action="Modo foco ligado">Ligar</button></li>
                    </ul>
                </section>
            `
        })
    }
};

const state = {
    activeView: "painel",
    activeContext: "dashboard"
};

const mainContent = document.getElementById("main-content");
const pathLabel = document.getElementById("path-label");
const navItems = Array.from(document.querySelectorAll(".rail-item"));
const tabs = Array.from(document.querySelectorAll(".tab"));
const toast = document.getElementById("app-toast");

const chatMessages = document.getElementById("chat-messages");
const chatInput = document.getElementById("chat-input");
const chatForm = document.getElementById("chat-form");
const quickButtons = Array.from(document.querySelectorAll("[data-quick]"));
const chipButtons = Array.from(document.querySelectorAll("#chat-chips button"));

function showToast(message) {
    toast.textContent = message;
    toast.classList.add("show");
    clearTimeout(showToast.timeoutRef);
    showToast.timeoutRef = setTimeout(() => toast.classList.remove("show"), 1800);
}

function updatePath() {
    const contextName = contextLabels[state.activeContext] || "Contexto";
    if (embedContexts[state.activeContext]) {
        pathLabel.innerHTML = `${embedContexts[state.activeContext].path} &nbsp;&gt;&nbsp; <strong>${contextName}</strong>`;
        return;
    }

    const currentView = viewConfig[state.activeView];
    pathLabel.innerHTML = `${currentView.path} &nbsp;&gt;&nbsp; <strong>${contextName}</strong>`;
}

function bindDynamicActions() {
    Array.from(mainContent.querySelectorAll("[data-action]")).forEach((element) => {
        element.addEventListener("click", () => showToast(element.dataset.action));
    });
}

function renderActiveView() {
    const infoPanel = document.querySelector(".info-panel");
    if (embedContexts[state.activeContext]) {
        const embedData = embedContexts[state.activeContext];
        infoPanel.classList.add("embed-mode");
        mainContent.classList.add("full-embed");
        mainContent.innerHTML = `
            <div class="iframe-shell">
                <iframe
                    class="embed-frame"
                    src="${embedData.src}"
                    title="${contextLabels[state.activeContext]}"
                    loading="eager"
                    allow="autoplay; clipboard-read; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                    referrerpolicy="strict-origin-when-cross-origin"
                ></iframe>
            </div>
        `;
        updatePath();
        return;
    }

    infoPanel.classList.remove("embed-mode");
    mainContent.classList.remove("full-embed");
    const currentView = viewConfig[state.activeView];
    const contextName = contextLabels[state.activeContext] || "Dashboard";
    const rendered = currentView.render(contextName);

    if (rendered.type === "template") {
        const template = document.getElementById(rendered.id);
        mainContent.innerHTML = template.innerHTML;
        const subtitle = mainContent.querySelector(".title-row p");
        if (subtitle) {
            subtitle.textContent += ` Contexto ativo: ${contextName}.`;
        }
    } else {
        mainContent.innerHTML = rendered.html;
    }

    updatePath();
    bindDynamicActions();
}

function setActiveNav(viewKey) {
    state.activeView = viewKey;
    navItems.forEach((item) => {
        item.classList.toggle("active", item.dataset.view === viewKey);
    });
    renderActiveView();
}

function setActiveContext(contextKey) {
    state.activeContext = contextKey;
    Array.from(document.querySelectorAll(".tab")).forEach((tab) => {
        tab.classList.toggle("active", tab.dataset.context === contextKey);
    });
    renderActiveView();
}

function getCurrentTime() {
    return new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

function appendMessage(role, text, options = {}) {
    const message = document.createElement("article");
    message.className = `chat-msg ${role}${options.typing ? " typing" : ""}`;
    message.innerHTML = `<p>${text}</p><time>${options.time || getCurrentTime()}</time>`;
    chatMessages.appendChild(message);
    const maxVisibleMessages = 8;
    const fixedIntroMessages = 2;
    while (chatMessages.children.length > maxVisibleMessages) {
        chatMessages.children[fixedIntroMessages].remove();
    }
    chatMessages.scrollTop = chatMessages.scrollHeight;
    return message;
}

function buildBotReply(text) {
    const lower = text.toLowerCase();
    if (lower.includes("semana") || lower.includes("plano")) {
        return "Plano sugerido: 1) alinhar prioridades no inicio da manha; 2) bloco de foco para tarefa critica; 3) revisar entregas no fim do dia.";
    }
    if (lower.includes("prior") || lower.includes("pendenc")) {
        return "Priorize assim: impacto no negocio, prazo mais curto e dependencia de terceiros. Posso te montar uma ordem pronta se quiser.";
    }
    if (lower.includes("mentoria") || lower.includes("1:1") || lower.includes("reuniao")) {
        return "Para a mentoria, leve: status das entregas, bloqueios atuais, ajuda que voce precisa e um proximo passo claro para a semana.";
    }
    if (lower.includes("prazo") || lower.includes("entrega")) {
        return "Sugestao: quebre a entrega em 3 partes, defina checkpoints diarios e deixe 20% do tempo para revisao final.";
    }
    if (lower.includes("rotina") || lower.includes("foco")) {
        return "Rotina recomendada: 2 blocos de foco profundo, 1 bloco de comunicacao e 1 fechamento diario com checklist.";
    }
    return "Entendi. Posso te ajudar com plano semanal, priorizacao de tarefas, preparacao para mentoria e organizacao de prazos.";
}

function sendUserMessage(text) {
    const cleanText = text.trim();
    if (!cleanText) return;

    appendMessage("user", cleanText);
    const typing = appendMessage("bot", "Digitando...", { typing: true, time: "..." });

    setTimeout(() => {
        typing.remove();
        appendMessage("bot", buildBotReply(cleanText));
    }, 520);
}

navItems.forEach((item) => {
    item.setAttribute("title", item.dataset.label || "");
    item.addEventListener("click", (event) => {
        event.preventDefault();
        setActiveNav(item.dataset.view);
    });
});

tabs.forEach((tab) => {
    tab.addEventListener("click", () => setActiveContext(tab.dataset.context));
});

chatForm.addEventListener("submit", (event) => {
    event.preventDefault();
    sendUserMessage(chatInput.value);
    chatInput.value = "";
});

quickButtons.forEach((button) => {
    button.addEventListener("click", () => sendUserMessage(button.dataset.quick || button.textContent));
});

chipButtons.forEach((button) => {
    button.addEventListener("click", () => sendUserMessage(button.textContent));
});

document.querySelector(".assistant-head button").addEventListener("click", () => {
    showToast("Plano Pro: comparativo de desempenho habilitado");
});

renderActiveView();
