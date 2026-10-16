const themeToggle = document.getElementById("theme-toggle");

// Load the saved theme, or use dark mode by default
const savedTheme = localStorage.getItem("portfolio-theme");

if (savedTheme === "light") {
    document.body.classList.add("light-theme");
}

function updateThemeButton() {
    const isLightMode = document.body.classList.contains("light-theme");

    themeToggle.textContent = isLightMode ? "🌙" : "☀️";

    themeToggle.setAttribute(
        "aria-label",
        isLightMode ? "Switch to dark mode" : "Switch to light mode"
    );
}

// Switch between dark and light mode
themeToggle.addEventListener("click", function () {
    document.body.classList.toggle("light-theme");

    const isLightMode = document.body.classList.contains("light-theme");

    localStorage.setItem(
        "portfolio-theme",
        isLightMode ? "light" : "dark"
    );

    updateThemeButton();
});

// Set the initial button icon
updateThemeButton();

// Automatically display the current year
document.getElementById("current-year").textContent =
    new Date().getFullYear();

// AI Chatbot elements
const openChatButton = document.getElementById("open-chat");
const chatLauncher = document.getElementById("chat-launcher");
const closeChatButton = document.getElementById("close-chat");
const chatWindow = document.getElementById("chat-window");
const chatForm = document.getElementById("chat-form");
const chatInput = document.getElementById("chat-input");
const chatMessages = document.getElementById("chat-messages");
let conversationHistory = [];

function openChat() {
    chatWindow.hidden = false;
    chatLauncher.hidden = true;

    requestAnimationFrame(() => {
        chatWindow.classList.add("chat-visible");
        chatInput.focus();
    });
}

function closeChat() {
    chatWindow.classList.remove("chat-visible");
    chatLauncher.hidden = false;

    setTimeout(() => {
        if (!chatWindow.classList.contains("chat-visible")) {
            chatWindow.hidden = true;
        }
    }, 230);
}

openChatButton.addEventListener("click", openChat);
chatLauncher.addEventListener("click", openChat);
closeChatButton.addEventListener("click", closeChat);

function addMessage(message, className) {
    const messageElement = document.createElement("div");
    messageElement.classList.add("message", className);
    messageElement.textContent = message;

    chatMessages.appendChild(messageElement);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

chatForm.addEventListener("submit", function (event) {
    event.preventDefault();

    const userMessage = chatInput.value.trim();

    if (!userMessage) return;

    addMessage(userMessage, "user-message");
    chatInput.value = "";

    const typing = document.createElement("div");
    typing.className = "typing-indicator";
    typing.textContent = "Assistant is typing...";
    chatMessages.appendChild(typing);

    chatMessages.scrollTop = chatMessages.scrollHeight;

    // Temporary response until the real AI API is connected
    (async () => {
    try {
        const response = await fetch("http://127.0.0.1:8000/api/chat", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            
body: JSON.stringify({
    message: userMessage,
    history: conversationHistory
})

        });

        if (!response.ok) {
            throw new Error("The chat request failed.");
        }

       
const data = await response.json();

typing.remove();
addMessage(data.reply, "bot-message");

conversationHistory.push(
    { role: "user", text: userMessage },
    { role: "assistant", text: data.reply }
);


    } catch (error) {
        typing.remove();
        addMessage(
            "Sorry, I couldn't connect to the AI assistant. Please try again.",
            "bot-message"
        );
        console.error("Chat error:", error);

    } finally {
        chatInput.focus();
    }
})();
});
async function loadPortfolioData() {
    const statusElement = document.getElementById("backend-status");

    try {
        const response = await fetch("http://127.0.0.1:8000/api/about");

        if (!response.ok) {
            throw new Error("Could not load portfolio data");
        }

        const data = await response.json();

        statusElement.textContent =
            `Backend connected! Role: ${data.role} | ` +
            `Interests: ${data.interests.join(", ")}`;
    } catch (error) {
        statusElement.textContent =
            "Backend connection failed. Make sure the Python server is running.";
        console.error("API error:", error);
    }
}

loadPortfolioData();
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
function renderIcons() {
    if (window.lucide) {
        window.lucide.createIcons();
    } else {
        console.warn("Lucide icons library has not loaded.");
    }
}

document.addEventListener("DOMContentLoaded", renderIcons);
window.addEventListener("load", renderIcons);