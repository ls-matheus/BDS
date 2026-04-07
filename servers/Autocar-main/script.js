const nav = document.querySelector(".barra");
const navSurface = document.querySelector(".organizacao");
const heroVideo = document.querySelector(".um video");
const linesVideo = document.querySelector(".linhas-navbar");
const contrastTargets = [...document.querySelectorAll("[data-contrast]")];
const contrastCanvas = document.createElement("canvas");
const contrastContext = contrastCanvas.getContext("2d", { willReadFrequently: true });

const logoTrigger = document.querySelector(".logo-trigger");
const profileTrigger = document.querySelector(".profile-trigger");
const profilePopup = document.getElementById("perfil-popup");
const chatbotPopup = document.getElementById("chatbot-popup");
const popupCloseButtons = [...document.querySelectorAll(".popup-close")];
const chatbotForm = document.querySelector(".chatbot-form");
const chatbotInput = document.querySelector(".chatbot-input");
const chatbotLog = document.querySelector(".chatbot-log");
const chatbotSend = document.querySelector(".chatbot-send");
const hoverMenu = document.querySelector(".menu-hover");
const menuItems = [...document.querySelectorAll(".menu-item")];
const navMenuTriggers = [...document.querySelectorAll(".organizacao a[data-menu-key]")];

const CONTRAST_INTERVAL_MS = 80;
const HOVER_CONTRAST_INTERVAL_MS = 0;
const LINES_REVERSE_SPEED = 1.1;
const NAV_MODE_BASE_THRESHOLD = 146;
const NAV_MODE_LIGHT_ENTER = 154;
const NAV_MODE_DARK_ENTER = 138;
const NAV_LUMINANCE_SMOOTHING = 0.22;
const CHAT_SESSION_STORAGE_KEY = "autocar_chat_session_id";
const CHAT_API_ENDPOINTS = (() => {
    const currentOriginEndpoint = `${window.location.origin}/api/chat`;
    const localBackendEndpoint = "http://127.0.0.1:8000/api/chat";
    const endpoints = [currentOriginEndpoint];

    if (currentOriginEndpoint !== localBackendEndpoint) {
        endpoints.push(localBackendEndpoint);
    }

    return endpoints;
})();

let contrastRafId = 0;
let linesReverseRafId = 0;
let lastContrastTs = 0;
let currentNavMode = "";
let smoothedNavLuminance = null;
let isNavHovered = false;
let menuHideTimer = 0;
let isPointerInsideMenu = false;
let isChatRequestInFlight = false;
const chatSessionId = getOrCreateChatSessionId();

const popupMap = {
    "perfil-popup": { popup: profilePopup, trigger: profileTrigger },
    "chatbot-popup": { popup: chatbotPopup, trigger: logoTrigger },
};

const NAV_MENU_OPTIONS = {
    home: [
        { label: "Configuracoes", href: "#" },
        { label: "Seguranca", href: "#" },
        { label: "Suporte 24/7", href: "#" },
    ],
    cars: [
        { label: "Manual", href: "#" },
        { label: "Automatico", href: "#" },
        { label: "Hibrido", href: "#" },
    ],
    buy: [
        { label: "Servicos", href: "#" },
        { label: "Acessorios", href: "#" },
        { label: "Sistemas", href: "#" },
    ],
    outros: [
        { label: "Uso da IA", href: "#" },
        { label: "Pecas com Problema", href: "#" },
        { label: "Monitoramento", href: "#" },
    ],
};

function getOrCreateChatSessionId() {
    let sessionId = "";
    try {
        sessionId = window.localStorage.getItem(CHAT_SESSION_STORAGE_KEY) || "";
    } catch {
        sessionId = "";
    }

    if (!sessionId) {
        if (window.crypto?.randomUUID) {
            sessionId = window.crypto.randomUUID();
        } else {
            sessionId = `autocar-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
        }

        try {
            window.localStorage.setItem(CHAT_SESSION_STORAGE_KEY, sessionId);
        } catch {}
    }

    return sessionId;
}

function getVideoMapping() {
    if (!heroVideo || heroVideo.readyState < 2 || heroVideo.videoWidth === 0 || heroVideo.videoHeight === 0) {
        return null;
    }

    const rect = heroVideo.getBoundingClientRect();
    const scale = Math.max(rect.width / heroVideo.videoWidth, rect.height / heroVideo.videoHeight);
    const drawnWidth = heroVideo.videoWidth * scale;
    const drawnHeight = heroVideo.videoHeight * scale;
    const offsetX = (rect.width - drawnWidth) / 2;
    const offsetY = (rect.height - drawnHeight) / 2;

    return { rect, scale, offsetX, offsetY };
}

function getAverageLuminance(targetRect, mapping) {
    if (!contrastContext || !mapping) {
        return null;
    }

    const left = Math.max(targetRect.left, mapping.rect.left);
    const top = Math.max(targetRect.top, mapping.rect.top);
    const right = Math.min(targetRect.right, mapping.rect.right);
    const bottom = Math.min(targetRect.bottom, mapping.rect.bottom);

    if (right <= left || bottom <= top) {
        return null;
    }

    const sourceX = (left - mapping.rect.left - mapping.offsetX) / mapping.scale;
    const sourceY = (top - mapping.rect.top - mapping.offsetY) / mapping.scale;
    const sourceWidth = (right - left) / mapping.scale;
    const sourceHeight = (bottom - top) / mapping.scale;

    contrastCanvas.width = 28;
    contrastCanvas.height = 14;
    contrastContext.drawImage(
        heroVideo,
        sourceX,
        sourceY,
        Math.max(1, sourceWidth),
        Math.max(1, sourceHeight),
        0,
        0,
        contrastCanvas.width,
        contrastCanvas.height
    );

    const { data } = contrastContext.getImageData(0, 0, contrastCanvas.width, contrastCanvas.height);
    let totalLuminance = 0;
    let samples = 0;

    for (let i = 0; i < data.length; i += 16) {
        totalLuminance += (0.2126 * data[i]) + (0.7152 * data[i + 1]) + (0.0722 * data[i + 2]);
        samples++;
    }

    return samples ? totalLuminance / samples : null;
}

function setAdaptiveMode(element, luminance, threshold = 146) {
    const mode = luminance !== null && luminance > threshold ? "adaptive-light" : "adaptive-dark";
    element.classList.toggle("adaptive-light", mode === "adaptive-light");
    element.classList.toggle("adaptive-dark", mode === "adaptive-dark");
}

function getStableNavMode(navLuminance) {
    if (navLuminance === null) {
        return currentNavMode || "video-dark";
    }

    if (smoothedNavLuminance === null) {
        smoothedNavLuminance = navLuminance;
    } else {
        smoothedNavLuminance += (navLuminance - smoothedNavLuminance) * NAV_LUMINANCE_SMOOTHING;
    }

    if (!currentNavMode) {
        return smoothedNavLuminance > NAV_MODE_BASE_THRESHOLD ? "video-light" : "video-dark";
    }

    if (currentNavMode === "video-light") {
        return smoothedNavLuminance < NAV_MODE_DARK_ENTER ? "video-dark" : "video-light";
    }

    return smoothedNavLuminance > NAV_MODE_LIGHT_ENTER ? "video-light" : "video-dark";
}

function updateContrast() {
    const mapping = getVideoMapping();
    if (!mapping || !nav || !navSurface) {
        return;
    }

    const navLuminance = getAverageLuminance(navSurface.getBoundingClientRect(), mapping);
    const isHoverBright = navLuminance !== null && navLuminance > NAV_MODE_BASE_THRESHOLD;
    nav.classList.toggle("hover-bright-bg", isNavHovered && isHoverBright);

    if (isNavHovered) {
        currentNavMode = "video-dark";
        nav.classList.remove("video-light");
        nav.classList.add("video-dark");
        contrastTargets.forEach((target) => {
            target.classList.remove("adaptive-light");
            target.classList.add("adaptive-dark");
        });
        return;
    }

    const nextNavMode = getStableNavMode(navLuminance);

    if (nextNavMode !== currentNavMode) {
        currentNavMode = nextNavMode;
        nav.classList.toggle("video-light", nextNavMode === "video-light");
        nav.classList.toggle("video-dark", nextNavMode === "video-dark");
    }

    contrastTargets.forEach((target) => {
        const luminance = getAverageLuminance(target.getBoundingClientRect(), mapping);
        setAdaptiveMode(target, luminance);
    });
}

function watchContrast(timeStamp) {
    const interval = isNavHovered ? HOVER_CONTRAST_INTERVAL_MS : CONTRAST_INTERVAL_MS;
    if (!lastContrastTs || (timeStamp - lastContrastTs) >= interval) {
        updateContrast();
        lastContrastTs = timeStamp;
    }

    if (!heroVideo?.paused && !heroVideo?.ended) {
        contrastRafId = requestAnimationFrame(watchContrast);
    }
}

function startContrastWatch() {
    cancelAnimationFrame(contrastRafId);
    lastContrastTs = 0;
    contrastRafId = requestAnimationFrame(watchContrast);
}

function stopLinesReverseLoop() {
    cancelAnimationFrame(linesReverseRafId);
    linesReverseRafId = 0;
}

function playLinesForward() {
    if (!linesVideo || linesVideo.readyState < 1) {
        return;
    }

    stopLinesReverseLoop();
    nav?.classList.add("hover-active");
    linesVideo.currentTime = 0;
    linesVideo.playbackRate = 1;

    const playPromise = linesVideo.play();
    if (playPromise && typeof playPromise.catch === "function") {
        playPromise.catch(() => {});
    }
}

function playLinesReverse() {
    if (!linesVideo || linesVideo.readyState < 1) {
        return;
    }

    stopLinesReverseLoop();
    linesVideo.pause();

    let lastReverseTs = 0;

    function reverseStep(timeStamp) {
        if (isNavHovered) {
            stopLinesReverseLoop();
            return;
        }

        if (!lastReverseTs) {
            lastReverseTs = timeStamp;
        }

        const deltaSeconds = Math.max(0.001, (timeStamp - lastReverseTs) / 1000);
        lastReverseTs = timeStamp;

        const nextTime = Math.max(0, linesVideo.currentTime - (deltaSeconds * LINES_REVERSE_SPEED));
        linesVideo.currentTime = nextTime;

        if (nextTime <= 0) {
            linesVideo.currentTime = 0;
            stopLinesReverseLoop();
            return;
        }

        linesReverseRafId = requestAnimationFrame(reverseStep);
    }

    linesReverseRafId = requestAnimationFrame(reverseStep);
}

function handleNavEnter() {
    isNavHovered = true;
    playLinesForward();
    updateContrast();
}

function handleNavLeave() {
    isNavHovered = false;
    nav?.classList.remove("hover-active");
    nav?.classList.remove("hover-bright-bg");
    playLinesReverse();
    hideHoverMenu(true);
    updateContrast();
}

function renderHoverMenu(menuKey) {
    const options = NAV_MENU_OPTIONS[menuKey] || NAV_MENU_OPTIONS.home;

    menuItems.forEach((item, index) => {
        const option = options[index];
        if (!option) {
            item.style.display = "none";
            return;
        }

        item.style.display = "inline-flex";
        item.textContent = option.label;
        item.href = option.href || "#";
    });
}

function showHoverMenu(menuKey) {
    if (!hoverMenu || hasOpenPopup()) {
        return;
    }

    window.clearTimeout(menuHideTimer);
    renderHoverMenu(menuKey);
    hoverMenu.classList.add("is-visible");
    hoverMenu.setAttribute("aria-hidden", "false");
}

function hideHoverMenu(immediate = false) {
    if (!hoverMenu) {
        return;
    }

    window.clearTimeout(menuHideTimer);

    if (immediate) {
        hoverMenu.classList.remove("is-visible");
        hoverMenu.setAttribute("aria-hidden", "true");
        return;
    }

    menuHideTimer = window.setTimeout(() => {
        if (isPointerInsideMenu) {
            return;
        }
        hoverMenu.classList.remove("is-visible");
        hoverMenu.setAttribute("aria-hidden", "true");
    }, 120);
}

function hasOpenPopup() {
    return Object.values(popupMap).some(({ popup }) => popup?.classList.contains("is-open"));
}

function syncMenuState() {
    nav?.classList.toggle("menu-open", hasOpenPopup());
}

function setPopupState(popupId, shouldOpen) {
    const item = popupMap[popupId];
    if (!item?.popup) {
        return;
    }

    item.popup.classList.toggle("is-open", shouldOpen);
    item.popup.setAttribute("aria-hidden", shouldOpen ? "false" : "true");

    if (item.trigger) {
        item.trigger.setAttribute("aria-expanded", shouldOpen ? "true" : "false");
    }

    syncMenuState();

    if (shouldOpen) {
        hideHoverMenu(true);
    }

    if (shouldOpen && popupId === "chatbot-popup") {
        window.requestAnimationFrame(() => chatbotInput?.focus());
    }
}

function closeAllPopups() {
    Object.keys(popupMap).forEach((popupId) => setPopupState(popupId, false));
}

function togglePopup(popupId) {
    const item = popupMap[popupId];
    if (!item?.popup) {
        return;
    }

    const shouldOpen = !item.popup.classList.contains("is-open");
    closeAllPopups();
    if (shouldOpen) {
        setPopupState(popupId, true);
    }
}

function appendChatMessage(text, role) {
    if (!chatbotLog || !text) {
        return;
    }

    const message = document.createElement("p");
    message.className = `chat-msg ${role}`;
    message.textContent = text;
    chatbotLog.appendChild(message);
    chatbotLog.scrollTop = chatbotLog.scrollHeight;
}

function setChatbotBusyState(isBusy) {
    isChatRequestInFlight = isBusy;

    if (chatbotInput) {
        chatbotInput.disabled = isBusy;
    }

    if (chatbotSend) {
        chatbotSend.disabled = isBusy;
        chatbotSend.textContent = isBusy ? "..." : "Enviar";
    }
}

async function requestBotReplyFromEndpoint(endpoint, message) {
    const response = await fetch(endpoint, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            message,
            sessionId: chatSessionId,
        }),
    });

    let data = null;
    try {
        data = await response.json();
    } catch {
        data = null;
    }

    if (!response.ok) {
        const serverError = data?.error ? ` ${data.error}` : "";
        throw new Error(`Erro ${response.status} em ${endpoint}.${serverError}`);
    }

    return data?.reply || "Nao consegui gerar resposta agora.";
}

async function requestBotReply(message) {
    let lastError = null;

    for (const endpoint of CHAT_API_ENDPOINTS) {
        try {
            return await requestBotReplyFromEndpoint(endpoint, message);
        } catch (error) {
            lastError = error;
            const isRecoverableHttpError =
                error instanceof Error && /Erro (404|405|501)/.test(error.message);

            if (!isRecoverableHttpError) {
                break;
            }
        }
    }

    if (lastError instanceof TypeError) {
        throw new Error("Servidor IA offline. Inicie o backend em http://127.0.0.1:8000.");
    }

    throw lastError || new Error("Falha ao falar com a IA.");
}

heroVideo?.addEventListener("loadeddata", updateContrast);
heroVideo?.addEventListener("play", startContrastWatch);
heroVideo?.addEventListener("pause", () => cancelAnimationFrame(contrastRafId));
heroVideo?.addEventListener("ended", () => cancelAnimationFrame(contrastRafId));

window.addEventListener("resize", updateContrast);

if (linesVideo) {
    linesVideo.loop = false;
    linesVideo.pause();
    linesVideo.currentTime = 0;

    linesVideo.addEventListener("ended", () => {
        linesVideo.pause();
    });
}

const navHoverTarget = nav || navSurface;
navHoverTarget?.addEventListener("mouseenter", handleNavEnter);
navHoverTarget?.addEventListener("mouseleave", handleNavLeave);

navMenuTriggers.forEach((trigger) => {
    const menuKey = trigger.dataset.menuKey || "home";
    trigger.addEventListener("mouseenter", () => showHoverMenu(menuKey));
    trigger.addEventListener("focus", () => showHoverMenu(menuKey));
    trigger.addEventListener("mouseleave", () => hideHoverMenu(false));
    trigger.addEventListener("blur", () => hideHoverMenu(false));
});

hoverMenu?.addEventListener("mouseenter", () => {
    isPointerInsideMenu = true;
    window.clearTimeout(menuHideTimer);
});

hoverMenu?.addEventListener("mouseleave", () => {
    isPointerInsideMenu = false;
    hideHoverMenu(false);
});

logoTrigger?.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    togglePopup("chatbot-popup");
});

profileTrigger?.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    togglePopup("perfil-popup");
});

popupCloseButtons.forEach((button) => {
    button.addEventListener("click", (event) => {
        event.preventDefault();
        const popupId = button.dataset.closePopup;
        if (popupId) {
            setPopupState(popupId, false);
        }
    });
});

document.addEventListener("pointerdown", (event) => {
    const target = event.target;
    if (!(target instanceof Element)) {
        return;
    }

    if (hasOpenPopup()) {
        if (target.closest(".nav-popup") || target.closest(".logo-trigger") || target.closest(".profile-trigger")) {
            return;
        }
        closeAllPopups();
    }

    if (!target.closest(".organizacao a[data-menu-key]") && !target.closest(".menu-hover")) {
        hideHoverMenu(true);
    }
});

document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
        closeAllPopups();
    }
});

menuItems.forEach((item) => {
    item.addEventListener("click", (event) => event.preventDefault());
});

chatbotForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!chatbotInput || isChatRequestInFlight) {
        return;
    }

    const text = chatbotInput.value.trim();
    if (!text) {
        return;
    }

    appendChatMessage(text, "user");
    chatbotInput.value = "";
    setChatbotBusyState(true);

    try {
        const reply = await requestBotReply(text);
        appendChatMessage(reply, "bot");
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Falha ao falar com a IA.";
        appendChatMessage(errorMessage, "bot");
        console.error(error);
    } finally {
        setChatbotBusyState(false);
        chatbotInput.focus();
    }
});

Object.values(popupMap).forEach(({ popup, trigger }) => {
    popup?.setAttribute("aria-hidden", "true");
    trigger?.setAttribute("aria-expanded", "false");
});

startContrastWatch();
