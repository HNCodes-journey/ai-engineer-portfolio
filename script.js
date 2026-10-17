"use strict";

/* =========================================
   0. CONFIG
   Put your deployed backend URL below
   (the one from Render, no trailing slash).
   ========================================= */

const API_BASE =
    location.hostname === "localhost" || location.hostname === "127.0.0.1"
        ? "http://127.0.0.1:8000"
        : "https://YOUR-SERVICE.onrender.com";

const CHAT_TIMEOUT_MS = 60000; // free hosts can take ~60s to wake up

/* =========================================
   1. THEME TOGGLE
   ========================================= */

const themeToggle = document.getElementById("theme-toggle");

function readSavedTheme() {
    try {
        return localStorage.getItem("portfolio-theme");
    } catch (error) {
        return null;
    }
}

function saveTheme(theme) {
    try {
        localStorage.setItem("portfolio-theme", theme);
    } catch (error) {
        /* storage can be blocked; the theme still works for this visit */
    }
}

if (readSavedTheme() === "light") {
    document.body.classList.add("light-theme");
}

function updateThemeButton() {
    if (!themeToggle) return;

    const isLightMode = document.body.classList.contains("light-theme");

    themeToggle.textContent = isLightMode ? "🌙" : "☀️";
    themeToggle.setAttribute(
        "aria-label",
        isLightMode ? "Switch to dark mode" : "Switch to light mode"
    );
}

if (themeToggle) {
    updateThemeButton();

    themeToggle.addEventListener("click", () => {
        document.body.classList.toggle("light-theme");

        saveTheme(
            document.body.classList.contains("light-theme") ? "light" : "dark"
        );
        updateThemeButton();
    });
}

/* =========================================
   2. CURRENT YEAR
   ========================================= */

const currentYear = document.getElementById("current-year");

if (currentYear) {
    currentYear.textContent = new Date().getFullYear();
}

/* =========================================
   3. AI CHATBOT
   ========================================= */

const openChatButton = document.getElementById("open-chat");
const chatLauncher = document.getElementById("chat-launcher");
const closeChatButton = document.getElementById("close-chat");
const chatWindow = document.getElementById("chat-window");
const chatForm = document.getElementById("chat-form");
const chatInput = document.getElementById("chat-input");
const chatMessages = document.getElementById("chat-messages");

let conversationHistory = [];
let chatRequestPending = false;
let closeTimer = null;

function isChatOpen() {
    return Boolean(chatWindow && !chatWindow.hidden);
}

function openChat() {
    if (!chatWindow) return;

    clearTimeout(closeTimer);
    chatWindow.hidden = false;

    if (chatLauncher) {
        chatLauncher.hidden = true;
    }

    requestAnimationFrame(() => {
        chatWindow.classList.add("chat-visible");
        chatInput?.focus();
    });
}

function closeChat() {
    if (!chatWindow) return;

    chatWindow.classList.remove("chat-visible");

    if (chatLauncher) {
        chatLauncher.hidden = false;
        chatLauncher.focus();
    }

    closeTimer = setTimeout(() => {
        if (!chatWindow.classList.contains("chat-visible")) {
            chatWindow.hidden = true;
        }
    }, 230);
}

openChatButton?.addEventListener("click", openChat);
chatLauncher?.addEventListener("click", openChat);
closeChatButton?.addEventListener("click", closeChat);

/* Allow the robot card to open the assistant */
document.getElementById("robotAssistant")?.addEventListener("click", openChat);

/* Close the chat with the Escape key */
document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && isChatOpen()) {
        closeChat();
    }
});

function addMessage(message, className) {
    if (!chatMessages) return;

    const messageElement = document.createElement("div");
    messageElement.classList.add("message", className);
    messageElement.textContent = message;

    chatMessages.appendChild(messageElement);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

if (chatForm && chatInput && chatMessages) {
    chatForm.addEventListener("submit", async (event) => {
        event.preventDefault();

        const userMessage = chatInput.value.trim();

        if (!userMessage || chatRequestPending) return;

        addMessage(userMessage, "user-message");
        chatInput.value = "";

        const typing = document.createElement("div");
        typing.className = "typing-indicator";
        typing.textContent = "Assistant is typing...";
        chatMessages.appendChild(typing);
        chatMessages.scrollTop = chatMessages.scrollHeight;

        chatRequestPending = true;

        const submitButton = chatForm.querySelector(
            'button[type="submit"], input[type="submit"]'
        );

        if (submitButton) submitButton.disabled = true;
        chatInput.disabled = true;

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), CHAT_TIMEOUT_MS);

        try {
            const response = await fetch(`${API_BASE}/api/chat`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    message: userMessage,
                    history: conversationHistory.slice(-10)
                }),
                signal: controller.signal
            });

            if (!response.ok) {
                let detail = "";

                try {
                    const errorData = await response.json();
                    if (typeof errorData.detail === "string") {
                        detail = errorData.detail;
                    }
                } catch (parseError) {
                    /* response had no JSON body */
                }

                const error = new Error(`Chat request failed (${response.status})`);
                // Only rate-limit messages are safe and useful to show visitors
                error.userMessage = response.status === 429 ? detail : "";
                throw error;
            }

            const data = await response.json();

            if (typeof data.reply !== "string" || !data.reply.trim()) {
                throw new Error("The assistant returned an empty response.");
            }

            addMessage(data.reply, "bot-message");

            conversationHistory.push(
                { role: "user", text: userMessage },
                { role: "assistant", text: data.reply }
            );

            // Keep only the most recent 10 messages in browser memory.
            conversationHistory = conversationHistory.slice(-10);
        } catch (error) {
            const timedOut = error.name === "AbortError";

            addMessage(
                error.userMessage ||
                    (timedOut
                        ? "The assistant is taking too long to wake up. Please try again in a moment."
                        : "Sorry, I couldn't connect to the AI assistant. Please try again."),
                "bot-message"
            );

            console.error("Chat error:", error);
        } finally {
            clearTimeout(timeout);
            typing.remove();
            chatRequestPending = false;
            chatInput.disabled = false;

            if (submitButton) submitButton.disabled = false;

            chatInput.focus();
        }
    });
}
/* Suggested question chips: click one to send it, hide them after the first message */
const chatSuggestions = document.getElementById("chat-suggestions");

chatSuggestions?.addEventListener("click", (event) => {
    const chip = event.target.closest("button[data-question]");

    if (!chip || chatRequestPending || !chatForm || !chatInput) return;

    chatInput.value = chip.dataset.question;
    chatForm.requestSubmit();
});

chatForm?.addEventListener("submit", () => {
    if (chatSuggestions) chatSuggestions.hidden = true;
});

/* =========================================
   4. WAKE UP THE BACKEND
   Free hosts sleep when idle. A silent ping on
   page load starts the server before someone chats.
   ========================================= */

fetch(`${API_BASE}/api/health`).catch(() => {});

/* =========================================
   5. SCROLL REVEAL ANIMATIONS
   ========================================= */

const revealElements = document.querySelectorAll(
    ".dashboard > .card, .details-card"
);

if ("IntersectionObserver" in window) {
    const revealObserver = new IntersectionObserver(
        (entries, observer) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    entry.target.classList.add("is-visible");
                    observer.unobserve(entry.target);
                }
            });
        },
        { threshold: 0.12 }
    );

    revealElements.forEach((element) => {
        element.classList.add("reveal-on-scroll");
        revealObserver.observe(element);
    });
} else {
    revealElements.forEach((element) => {
        element.classList.add("is-visible");
    });
}

/* =========================================
   6. LUCIDE ICONS
   ========================================= */

function renderIcons() {
    if (window.lucide) {
        window.lucide.createIcons();
    }
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", renderIcons);
} else {
    renderIcons();
}

/* =========================================
   7. SKILL PILL CURSOR EFFECT
   ========================================= */

document.querySelectorAll(".skills-card .skill-tags span").forEach((skill) => {
    skill.addEventListener("pointermove", (event) => {
        const rect = skill.getBoundingClientRect();

        if (!rect.width || !rect.height) return;

        const x = ((event.clientX - rect.left) / rect.width) * 100;
        const y = ((event.clientY - rect.top) / rect.height) * 100;

        skill.style.setProperty("--mouse-x", `${x}%`);
        skill.style.setProperty("--mouse-y", `${y}%`);
    });
});

/* =========================================
   8. ROBOT CURSOR TRACKING
   Sets --rx and --ry (-1 to 1) on the robot SVG;
   style.css turns them into head/face/eye movement.
   ========================================= */

(function initRobotTracking() {
    const stage = document.getElementById("robotEyeTracker");
    const robot = stage ? stage.querySelector(".robot-svg") : null;

    if (!robot) return;

    const reduceMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
    ).matches;

    if (reduceMotion) return;

    const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

    const target = { x: 0, y: 0 };
    const current = { x: 0, y: 0 };
    let frame = null;
    let idleTimer = null;

    function render() {
        // Ease toward the target for smooth, slightly lagging motion
        current.x += (target.x - current.x) * 0.14;
        current.y += (target.y - current.y) * 0.14;

        robot.style.setProperty("--rx", current.x.toFixed(3));
        robot.style.setProperty("--ry", current.y.toFixed(3));

        const settled =
            Math.abs(target.x - current.x) < 0.002 &&
            Math.abs(target.y - current.y) < 0.002;

        frame = settled ? null : requestAnimationFrame(render);
    }

    function schedule() {
        if (!frame) frame = requestAnimationFrame(render);
    }

    function lookAt(clientX, clientY) {
        const rect = robot.getBoundingClientRect();

        if (!rect.width) return;

        // The head's center is the point the robot looks from
        const headX = rect.left + rect.width / 2;
        const headY = rect.top + rect.height * 0.42;
        const reach = Math.max(260, window.innerWidth * 0.28);

        target.x = clamp((clientX - headX) / reach, -1, 1);
        target.y = clamp((clientY - headY) / reach, -1, 1);
        schedule();
    }

    function recenter() {
        target.x = 0;
        target.y = 0;
        schedule();
    }

    function stopIdle() {
        if (idleTimer) {
            clearInterval(idleTimer);
            idleTimer = null;
        }
    }

    window.addEventListener(
        "pointermove",
        (event) => {
            stopIdle();
            lookAt(event.clientX, event.clientY);
        },
        { passive: true }
    );

    window.addEventListener(
        "pointerdown",
        (event) => lookAt(event.clientX, event.clientY),
        { passive: true }
    );

    document.documentElement.addEventListener("mouseleave", recenter);
    window.addEventListener("blur", recenter);

    /* Touch devices have no hover, so the robot gently looks around */
    if (window.matchMedia("(hover: none)").matches) {
        idleTimer = setInterval(() => {
            target.x = (Math.random() * 2 - 1) * 0.8;
            target.y = (Math.random() * 2 - 1) * 0.5;
            schedule();
        }, 2600);
    }
})();