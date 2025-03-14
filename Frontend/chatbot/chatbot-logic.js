class BankingChatbot {
    constructor() {
        this.container = document.getElementById('chatbot-container');
        this.messagesContainer = document.getElementById('chatbot-messages');
        this.userInput = document.getElementById('user-input');
        this.sendButton = document.getElementById('send-message');
        this.toggleButton = document.getElementById('toggle-chatbot');
        this.minimizeButton = document.getElementById('minimize-chat');
        
        this.initialize();
    }

    initialize() {
        this.bindEvents();
        this.loadKnowledgeBase();
        this.initializeChatbot();
    }

    bindEvents() {
        this.sendButton.addEventListener('click', () => this.handleUserInput());
        this.userInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.handleUserInput();
        });
        this.toggleButton.addEventListener('click', () => this.toggleChat());
        this.minimizeButton.addEventListener('click', () => this.minimizeChat());
    }

    async handleUserInput() {
        const userMessage = this.userInput.value.trim();
        if (!userMessage) return;

        // Add user message to chat
        this.addMessage(userMessage, 'user');
        this.userInput.value = '';

        // Show typing indicator
        this.showTypingIndicator();

        // Get bot response
        const response = await this.generateResponse(userMessage);
        
        // Remove typing indicator and add bot response
        this.removeTypingIndicator();
        this.addMessage(response, 'bot');
    }

    addMessage(message, type) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${type}-message`;
        
        if (type === 'bot') {
            messageDiv.innerHTML = `
                <i class="fas fa-robot bot-icon"></i>
                <div class="message-content">${message}</div>
            `;
        } else {
            messageDiv.innerHTML = `
                <div class="message-content">${message}</div>
            `;
        }

        this.messagesContainer.appendChild(messageDiv);
        this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
    }

    showTypingIndicator() {
        const typingDiv = document.createElement('div');
        typingDiv.className = 'message bot-message typing-indicator';
        typingDiv.innerHTML = `
            <i class="fas fa-robot bot-icon"></i>
            <div class="message-content">
                <span class="typing-dot">.</span>
                <span class="typing-dot">.</span>
                <span class="typing-dot">.</span>
            </div>
        `;
        this.messagesContainer.appendChild(typingDiv);
        this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
    }

    removeTypingIndicator() {
        const typingIndicator = this.messagesContainer.querySelector('.typing-indicator');
        if (typingIndicator) {
            typingIndicator.remove();
        }
    }

    async generateResponse(userMessage) {
        // Normalize user input
        const input = userMessage.toLowerCase();

        if (input === "hello") {
            return "Hello!";
        } else if (input === "hi") {
            return "Hi!";
        }

        // Check knowledge base for matching response
        for (const [keywords, response] of this.knowledgeBase) {
            if (keywords.some(keyword => input.includes(keyword))) {
                return response;
            }
        }

        // Default response if no match found
        return "I'm not sure about that. Would you like to speak with a human representative? You can call our support at 1-800-SAFEBANK.";
    }

    loadKnowledgeBase() {
        // Define pairs of keywords and responses
        this.knowledgeBase = [
            [
                ['balance', 'how much', 'account balance'],
                "You can check your account balance in the 'Balance' tab of your dashboard. Would you like me to guide you there?"
            ],
            [
                ['transfer', 'send money', 'payment'],
                "To make a transfer, click on the 'Transactions' tab and select 'Send Money'. The daily transfer limit is ₹1,00,000."
            ],
            [
                ['limit', 'transfer limit', 'maximum'],
                "The daily transfer limit is ₹1,00,000. For higher limits, please visit your nearest branch with ID proof."
            ],
            [
                ['statement', 'bank statement', 'transaction history'],
                "You can download your bank statement from the 'Bank Statement' tab. Statements are available for the last 12 months."
            ],
            [
                ['password', 'forgot password', 'reset'],
                "To reset your password, please click on 'Forgot Password' on the login page or call our 24/7 support at 1-800-SAFEBANK."
            ],
            [
                ['branch', 'atm', 'location'],
                "You can find nearby branches and ATMs using our locator service. Would you like me to share the link?"
            ],
            [
                ['loan', 'interest', 'borrow'],
                "We offer various types of loans with competitive interest rates. Personal loans start at 10.5% p.a. Would you like to know more?"
            ],
            [
                ['card', 'credit card', 'debit card'],
                "For credit/debit card related queries, please visit the 'Cards' section or call our dedicated cards helpline at 1-800-CARDS."
            ]
        ];
    }

    initializeChatbot() {
        this.addMessage("Hello! I'm your SafeBank Assistant. How can I assist you today?", 'bot');
    }

    toggleChat() {
        this.container.classList.toggle('hidden');
        if (!this.container.classList.contains('hidden')) {
            this.userInput.focus();
        }
    }

    minimizeChat() {
        this.container.classList.toggle('minimized');
    }
}

// Initialize chatbot when document is ready
document.addEventListener('DOMContentLoaded', () => {
    const chatbot = new BankingChatbot();
});