const routes = {
    home: "Nav/home.html",
    bds: "Nav/BDS.html",
    dev: "Nav/dev.html",
    style: "Nav/style.html",
};
const bdsCourses = {
    "1ds": "Nav/bds-1ds.html",
    "2ds": "Nav/bds-2ds.html",
    "3ds": "Nav/bds-3ds.html",
};

const appContent = document.getElementById("app-content");
const navLinks = Array.from(document.querySelectorAll(".barra a[data-route]"));
const bannerCache = new Map();
const routeMarkupCache = new Map();
const routeRequestCache = new Map();
const bdsCourseCache = new Map();
const bdsCourseRequestCache = new Map();
const HAPTIC_CLICK_MS = 14;
const HAPTIC_COOLDOWN_MS = 90;
let currentRoute = null;
let lastHapticAt = 0;
const bannerCandidates = [
    "banner.png",
    "banner.jpg",
    "banner.jpeg",
    "banner.webp",
    "banner.avif",
    "banner.svg",
    "banner2.svg",
    "bannerP.svg",
    "bannerC.svg",
];

function triggerHapticFeedback() {
    if (!("vibrate" in navigator)) {
        return;
    }

    const now = Date.now();
    if (now - lastHapticAt < HAPTIC_COOLDOWN_MS) {
        return;
    }

    lastHapticAt = now;
    navigator.vibrate(HAPTIC_CLICK_MS);
}

function initHapticClicks() {
    document.addEventListener(
        "click",
        (event) => {
            const target = event.target;
            if (!(target instanceof Element)) {
                return;
            }

            const clickable = target.closest("button, a[href], [role='button']");
            if (!clickable || clickable.hasAttribute("data-no-vibrate")) {
                return;
            }

            triggerHapticFeedback();
        },
        { passive: true }
    );
}

function normalizeRoute(rawHash) {
    const route = String(rawHash || "").replace("#", "").trim().toLowerCase();
    return routes[route] ? route : "home";
}

function setActiveLink(route) {
    navLinks.forEach((link) => {
        const isActive = link.dataset.route === route;
        link.classList.toggle("active", isActive);
        link.setAttribute("aria-current", isActive ? "page" : "false");
    });
}

function renderError(fileName) {
    appContent.className = "error-state";
    appContent.innerHTML = `
        <strong>Nao foi possivel carregar ${fileName}.</strong>
        <p>Abra o projeto com um servidor local (ex: Live Server).</p>
    `;
}

function getFallbackMarkup(route) {
    return `<section class="page"><h1>${route.toUpperCase()}</h1><p>Pagina vazia.</p></section>`;
}

async function resolveBanner(rootPath) {
    if (!rootPath) {
        return "assets/Logo.png";
    }

    if (bannerCache.has(rootPath)) {
        return bannerCache.get(rootPath);
    }

    for (const fileName of bannerCandidates) {
        const candidate = `${rootPath}/${fileName}`;

        try {
            const response = await fetch(candidate, { method: "HEAD", cache: "no-store" });
            if (response.ok) {
                bannerCache.set(rootPath, candidate);
                return candidate;
            }

            if (response.status === 405) {
                const fallbackResponse = await fetch(candidate, { cache: "no-store" });
                if (fallbackResponse.ok) {
                    bannerCache.set(rootPath, candidate);
                    return candidate;
                }
            }
        } catch (error) {
            console.debug(`Banner nao encontrado em ${candidate}`, error);
        }
    }

    const fallback = "assets/Logo.png";
    bannerCache.set(rootPath, fallback);
    return fallback;
}

function initProjectBanners() {
    const cards = Array.from(appContent.querySelectorAll(".mini-card[data-banner-root]"));

    cards.forEach(async (card) => {
        const img = card.querySelector("[data-banner]");
        const rootPath = card.dataset.bannerRoot;

        if (!img || !rootPath) {
            return;
        }

        img.src = await resolveBanner(rootPath);
    });
}

function initCarousels() {
    const carousels = Array.from(appContent.querySelectorAll("[data-carousel]"));

    carousels.forEach((carousel) => {
        const pages = Array.from(carousel.querySelectorAll("[data-carousel-page]"));
        const dots = Array.from(carousel.querySelectorAll("[data-carousel-dot]"));
        const prevBtn = carousel.querySelector("[data-carousel-prev]");
        const nextBtn = carousel.querySelector("[data-carousel-next]");
        const autoplayValue = Number.parseInt(carousel.dataset.carouselAutoplay || "0", 10);
        const autoplayMs = Number.isFinite(autoplayValue) ? autoplayValue : 0;

        if (!pages.length) {
            return;
        }

        let currentIndex = pages.findIndex((page) => page.classList.contains("is-active"));
        let autoplayTimer = null;
        let touchStartX = 0;
        let touchStartY = 0;
        let touchIdentifier = null;
        if (currentIndex < 0) {
            currentIndex = 0;
        }

        const setPage = (nextIndex) => {
            currentIndex = (nextIndex + pages.length) % pages.length;

            pages.forEach((page, index) => {
                page.classList.toggle("is-active", index === currentIndex);
            });

            dots.forEach((dot, index) => {
                dot.classList.toggle("is-active", index === currentIndex);
            });
        };

        const stopAutoplay = () => {
            if (!autoplayTimer) {
                return;
            }

            clearInterval(autoplayTimer);
            autoplayTimer = null;
        };

        const startAutoplay = () => {
            if (autoplayMs < 1500 || pages.length <= 1) {
                return;
            }

            stopAutoplay();
            autoplayTimer = setInterval(() => {
                if (!document.body.contains(carousel)) {
                    stopAutoplay();
                    return;
                }

                setPage(currentIndex + 1);
            }, autoplayMs);
        };

        const goToPage = (index) => {
            setPage(index);
            startAutoplay();
        };

        prevBtn?.addEventListener("click", () => goToPage(currentIndex - 1));
        nextBtn?.addEventListener("click", () => goToPage(currentIndex + 1));

        dots.forEach((dot, index) => {
            dot.addEventListener("click", () => goToPage(index));
        });

        const handleTouchStart = (event) => {
            if (!event.touches || event.touches.length !== 1) {
                touchIdentifier = null;
                return;
            }

            const touch = event.touches[0];
            touchIdentifier = touch.identifier;
            touchStartX = touch.clientX;
            touchStartY = touch.clientY;
            stopAutoplay();
        };

        const handleTouchEnd = (event) => {
            if (!event.changedTouches || !event.changedTouches.length || touchIdentifier === null) {
                startAutoplay();
                return;
            }

            const changedTouches = Array.from(event.changedTouches);
            const touch = changedTouches.find((item) => item.identifier === touchIdentifier) || changedTouches[0];
            const diffX = touch.clientX - touchStartX;
            const diffY = touch.clientY - touchStartY;
            const absX = Math.abs(diffX);
            const absY = Math.abs(diffY);

            touchIdentifier = null;

            if (absX >= 42 && absX > absY * 1.15) {
                goToPage(diffX < 0 ? currentIndex + 1 : currentIndex - 1);
                return;
            }

            startAutoplay();
        };

        setPage(currentIndex);
        startAutoplay();

        carousel.addEventListener("mouseenter", stopAutoplay);
        carousel.addEventListener("mouseleave", startAutoplay);
        carousel.addEventListener("focusin", stopAutoplay);
        carousel.addEventListener("focusout", (event) => {
            if (!carousel.contains(event.relatedTarget)) {
                startAutoplay();
            }
        });
        carousel.addEventListener("touchstart", handleTouchStart, { passive: true });
        carousel.addEventListener("touchend", handleTouchEnd, { passive: true });
        carousel.addEventListener("touchcancel", () => {
            touchIdentifier = null;
            startAutoplay();
        });
    });
}

async function fetchBdsCourseMarkup(courseKey) {
    const normalizedCourse = bdsCourses[courseKey] ? courseKey : "1ds";
    const fileName = bdsCourses[normalizedCourse];

    if (bdsCourseCache.has(normalizedCourse)) {
        return bdsCourseCache.get(normalizedCourse);
    }

    if (bdsCourseRequestCache.has(normalizedCourse)) {
        return bdsCourseRequestCache.get(normalizedCourse);
    }

    const request = (async () => {
        const response = await fetch(fileName, { cache: "no-store" });

        if (!response.ok) {
            throw new Error(`Falha ao carregar ${fileName}: ${response.status}`);
        }

        const markup = (await response.text()).trim();
        bdsCourseCache.set(normalizedCourse, markup);
        return markup;
    })();

    bdsCourseRequestCache.set(normalizedCourse, request);

    try {
        return await request;
    } finally {
        bdsCourseRequestCache.delete(normalizedCourse);
    }
}

function initBdsBrowser() {
    const browser = appContent.querySelector("[data-bds-browser]");
    if (!browser) {
        return;
    }

    const courseButtons = Array.from(appContent.querySelectorAll("[data-bds-course]"));
    const sectionNav = browser.querySelector("[data-docs-section-nav]");
    const courseHost = browser.querySelector("[data-docs-course-host]");
    const addressBar = browser.querySelector(".docs-browser-address");
    const sectionMenuToggle = browser.querySelector("[data-docs-menu-toggle]");
    const sectionMenuLabel = browser.querySelector("[data-docs-menu-label]");

    if (!courseButtons.length || !sectionNav || !courseHost) {
        return;
    }

    const getSectionById = (sectionId) => courseHost.querySelector(`[id="${sectionId}"]`);
    const getSections = () => Array.from(courseHost.querySelectorAll("[data-course-section]"));
    const isCompactBdsViewport = () => window.matchMedia("(max-width: 900px)").matches;

    const setSectionMenuOpen = (isOpen) => {
        const shouldOpen = Boolean(isOpen);
        sectionNav.classList.toggle("is-open", shouldOpen);
        if (sectionMenuToggle) {
            sectionMenuToggle.setAttribute("aria-expanded", shouldOpen ? "true" : "false");
        }
    };

    const updateSectionMenuLabel = (nextLabel) => {
        if (!sectionMenuLabel) {
            return;
        }

        sectionMenuLabel.textContent = nextLabel || "Secoes";
    };

    const setActiveCourseButton = (courseKey) => {
        courseButtons.forEach((button) => {
            const isActive = button.dataset.bdsCourse === courseKey;
            button.classList.toggle("is-active", isActive);
            button.setAttribute("aria-pressed", isActive ? "true" : "false");
        });
    };

    const setActiveSectionButton = (sectionId) => {
        const sectionButtons = Array.from(sectionNav.querySelectorAll(".docs-inner-link[data-section-id]"));
        let activeLabel = "Secoes";

        sectionButtons.forEach((button) => {
            const isActive = button.dataset.sectionId === sectionId;
            button.classList.toggle("is-active", isActive);
            button.setAttribute("aria-current", isActive ? "true" : "false");

            if (isActive) {
                activeLabel = button.textContent?.trim() || activeLabel;
            }
        });

        updateSectionMenuLabel(activeLabel);
    };

    const buildSectionNav = (courseKey) => {
        const sections = getSections();
        sectionNav.innerHTML = "";

        sections.forEach((section, index) => {
            if (!section.id) {
                section.id = `${courseKey}-secao-${index + 1}`;
            }

            const title =
                section.dataset.sectionTitle ||
                section.querySelector("h2, h3")?.textContent?.trim() ||
                `Secao ${index + 1}`;

            const button = document.createElement("button");
            button.type = "button";
            button.className = "docs-inner-link";
            button.dataset.sectionId = section.id;
            button.textContent = title;
            sectionNav.appendChild(button);
        });

        return sections[0]?.id || null;
    };

    const activateSection = (sectionId) => {
        const sections = getSections();
        if (!sections.length) {
            return;
        }

        const activeSection = getSectionById(sectionId) || sections[0];

        sections.forEach((section) => {
            section.classList.toggle("is-active", section === activeSection);
        });

        setActiveSectionButton(activeSection.id);
    };

    sectionNav.addEventListener("click", (event) => {
        const button = event.target.closest(".docs-inner-link[data-section-id]");
        if (!button) {
            return;
        }

        const section = getSectionById(button.dataset.sectionId);
        if (!section) {
            return;
        }

        activateSection(button.dataset.sectionId);

        if (isCompactBdsViewport()) {
            setSectionMenuOpen(false);
        }
    });

    sectionMenuToggle?.addEventListener("click", () => {
        const shouldOpen = !sectionNav.classList.contains("is-open");
        setSectionMenuOpen(shouldOpen);
    });

    const loadCourse = async (courseKey) => {
        const normalizedCourse = bdsCourses[courseKey] ? courseKey : "1ds";
        setActiveCourseButton(normalizedCourse);

        if (addressBar) {
            addressBar.textContent = `biblioteca.local/docs/${normalizedCourse}`;
        }

        try {
            const markup = await fetchBdsCourseMarkup(normalizedCourse);
            courseHost.innerHTML = markup;
            courseHost.scrollTop = 0;
            const firstSectionId = buildSectionNav(normalizedCourse);
            if (firstSectionId) {
                activateSection(firstSectionId);
            }

            setSectionMenuOpen(!isCompactBdsViewport());
        } catch (error) {
            console.error(error);
            courseHost.innerHTML = `
                <article class="docs-course-empty">
                    <strong>Nao foi possivel carregar o conteudo.</strong>
                    <p>Tente novamente em instantes.</p>
                </article>
            `;
            sectionNav.innerHTML = "";
            updateSectionMenuLabel("Secoes");
            setSectionMenuOpen(false);
        }
    };

    courseButtons.forEach((button) => {
        button.addEventListener("click", () => {
            loadCourse(button.dataset.bdsCourse);
        });
    });

    const initialCourse = courseButtons.find((button) => button.classList.contains("is-active"))?.dataset.bdsCourse || "1ds";
    setSectionMenuOpen(!isCompactBdsViewport());
    loadCourse(initialCourse);
}

async function fetchRouteMarkup(route) {
    const fileName = routes[route];

    if (!fileName) {
        return getFallbackMarkup(route);
    }

    if (routeMarkupCache.has(route)) {
        return routeMarkupCache.get(route);
    }

    if (routeRequestCache.has(route)) {
        return routeRequestCache.get(route);
    }

    const request = (async () => {
        const response = await fetch(fileName, { cache: "no-store" });

        if (!response.ok) {
            throw new Error(`Falha ao carregar ${fileName}: ${response.status}`);
        }

        const markup = (await response.text()).trim() || getFallbackMarkup(route);
        routeMarkupCache.set(route, markup);
        return markup;
    })();

    routeRequestCache.set(route, request);

    try {
        return await request;
    } finally {
        routeRequestCache.delete(route);
    }
}

async function loadRoute(route) {
    const normalizedRoute = normalizeRoute(route);
    const fileName = routes[normalizedRoute];
    const visualRoute = normalizedRoute === "dev" || normalizedRoute === "style" ? "home" : normalizedRoute;

    document.body.setAttribute("data-route", visualRoute);
    document.body.setAttribute("data-view", normalizedRoute);
    setActiveLink(normalizedRoute);

    if (currentRoute === normalizedRoute && appContent.children.length > 0) {
        return;
    }

    try {
        const markup = await fetchRouteMarkup(normalizedRoute);
        appContent.className = "page-host";
        appContent.innerHTML = markup;
        initProjectBanners();
        initCarousels();
        initBdsBrowser();
        currentRoute = normalizedRoute;
    } catch (error) {
        console.error(error);
        currentRoute = null;
        renderError(fileName || normalizedRoute);
    }
}

function preloadBdsCoursesInBackground() {
    Object.keys(bdsCourses).forEach((courseKey) => {
        fetchBdsCourseMarkup(courseKey).catch((error) => {
            console.debug(`Falha no pre-load do curso ${courseKey}`, error);
        });
    });
}

function preloadRoutesInBackground() {
    Object.keys(routes).forEach((route) => {
        fetchRouteMarkup(route).catch((error) => {
            console.debug(`Falha no pre-load da rota ${route}`, error);
        });
    });
}

async function syncRouteFromHash() {
    const route = normalizeRoute(window.location.hash);

    if (window.location.hash !== `#${route}`) {
        history.replaceState(null, "", `#${route}`);
    }

    await loadRoute(route);
}

async function navigateTo(route) {
    const normalizedRoute = normalizeRoute(route);
    const nextHash = `#${normalizedRoute}`;

    if (window.location.hash !== nextHash) {
        history.pushState(null, "", nextHash);
    }

    await loadRoute(normalizedRoute);
}

window.addEventListener("hashchange", () => {
    syncRouteFromHash();
});

navLinks.forEach((link) => {
    link.addEventListener("click", async (event) => {
        event.preventDefault();
        const targetRoute = normalizeRoute(link.dataset.route);

        if (targetRoute !== currentRoute) {
            await navigateTo(targetRoute);
        }
    });
});

document.addEventListener("DOMContentLoaded", async () => {
    initHapticClicks();

    const initialRoute = normalizeRoute(window.location.hash || "#home");

    if (window.location.hash !== `#${initialRoute}`) {
        history.replaceState(null, "", `#${initialRoute}`);
    }

    await loadRoute(initialRoute);
    preloadRoutesInBackground();
    preloadBdsCoursesInBackground();
});
