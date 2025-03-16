document.addEventListener('DOMContentLoaded', () => {
    const paymentOptions = document.querySelectorAll('.payment-card .btn');
    const paymentForm = document.getElementById('payment-form');
    const quickPaymentForm = document.getElementById('quick-payment-form');
    const cancelPaymentBtn = document.getElementById('cancel-payment');
    const paymentTypeInput = document.getElementById('payment-type');
    const paymentAmountInput = document.getElementById('payment-amount');
    const totalAmountDisplay = document.getElementById('total-amount');

    // Open Payment Form
    paymentOptions.forEach(btn => {
        btn.addEventListener('click', (e) => {
            const paymentType = e.target.getAttribute('data-payment-type');
            paymentTypeInput.value = paymentType.replace('-', ' ').toUpperCase();
            
            // Hide payment options, show payment form
            document.querySelector('.payment-options').style.display = 'none';
            paymentForm.style.display = 'block';
        });
    });

    // Cancel Payment
    cancelPaymentBtn.addEventListener('click', () => {
        // Hide payment form, show payment options
        paymentForm.style.display = 'none';
        // document.querySelector('.payment-options').style.display = 'flex';
        window.location.href="../dashboard_page/dashboard.html";

    });

    // Update Total Amount
    paymentAmountInput.addEventListener('input', () => {
        const amount = parseFloat(paymentAmountInput.value) || 0;
        totalAmountDisplay.textContent = `Total: ₹${amount.toFixed(2)}`;
    });

    // Payment Form Submission
    quickPaymentForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const paymentType = paymentTypeInput.value;
        const billerDetails = document.getElementById('biller-details').value;
        const amount = parseFloat(paymentAmountInput.value);
        const paymentMethod = document.getElementById('payment-method').value;

        // Basic validation
        if (!billerDetails || !amount || !paymentMethod) {
            alert('Please fill in all details');
            return;
        }

        // Simulate payment processing
        const confirmPayment = confirm(`Confirm payment of ₹${amount} for ${paymentType}?`);
        
        if (confirmPayment) {
            alert('Payment processed successfully!');
            
            // Reset form and return to payment options
            quickPaymentForm.reset();
            paymentForm.style.display = 'none';
            document.querySelector('.payment-options').style.display = 'flex';
        }
    });

    // Bank Account Number Validation
    // function validateBankAccountNumber(accountNumber) {
    //     // Remove any spaces or dashes
    //     const cleanedAccountNumber = accountNumber.replace(/[\s-]/g, '');
        
    //     // Check if it's a valid length (9-18 digits)
    //     if (!/^\d{9,18}$/.test(cleanedAccountNumber)) {
    //         return false;
    //     }
        
    //     // Optional: Implement Luhn algorithm or bank-specific validation
    //     return true;
    // }

    // Transactions Tab Payment Gateway Logic
    const sendMoneyBtn = document.getElementById('send-money-btn');
    const requestMoneyBtn = document.getElementById('request-money-btn');
    const paymentGateway = document.getElementById('payment-gateway');
    const paymentFormTransactions = document.getElementById('payment-form');
    const cancelPaymentBtnTransactions = document.getElementById('cancel-payment');
    const paymentFormTitle = document.getElementById('payment-form-title');
    const paymentFormSubtitle = document.getElementById('payment-form-subtitle');

    // Transaction History Management
    function addTransactionToHistory(type, recipient, amount, description, status = 'completed') {
        const transactionList = document.getElementById('transaction-list');
        const newRow = transactionList.insertRow(0);
        
        const currentDate = new Date().toISOString().split('T')[0];
        const isIncome = type === 'request';
        
        newRow.innerHTML = `
            <td>${currentDate}</td>
            <td>${description || (isIncome ? `Money Request from ${recipient}` : `Transfer to ${recipient}`)}</td>
            <td class="${isIncome ? 'text-success' : 'text-danger'}">
                ${isIncome ? '+' : '-'}₹${amount.toLocaleString()}
            </td>
            <td><span class="status-badge ${status.toLowerCase()}">${status.charAt(0).toUpperCase() + status.slice(1)}</span></td>
        `;
    }

    // Toggle Payment Gateway
    function togglePaymentGateway(isSendMoney) {
        paymentGateway.style.display = 'block';
        const submitBtn = paymentFormTransactions.querySelector('button[type="submit"]');
        
        if (isSendMoney) {
            paymentFormTitle.textContent = 'Send Money';
            paymentFormSubtitle.textContent = 'Securely transfer funds to another bank account';
            submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Confirm Transfer';
            submitBtn.classList.remove('btn-primary');
            submitBtn.classList.add('btn-success');
        } else {
            paymentFormTitle.textContent = 'Request Money';
            paymentFormSubtitle.textContent = 'Request funds from another bank account';
            submitBtn.innerHTML = '<i class="fas fa-hand-holding-usd"></i> Confirm Request';
            submitBtn.classList.remove('btn-success');
            submitBtn.classList.add('btn-primary');
        }
    }

    // Send Money Button
    sendMoneyBtn.addEventListener('click', () => {
        window.location.href="../payment/paymentgateway.html";
    });

    // Request Money Button
    requestMoneyBtn.addEventListener('click', () => {
        window.location.href="../payment/paymentgateway.html";
    });

    // Cancel Payment
    cancelPaymentBtnTransactions.addEventListener('click', () => {
        paymentGateway.style.display = 'none';
        paymentFormTransactions.reset();
    });

    // Payment Form Submission
    paymentFormTransactions.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const recipient = document.getElementById('recipient').value;
        const amount = parseFloat(document.getElementById('amount').value);
        const paymentMethod = document.getElementById('payment-method').value;
        const description = document.getElementById('description').value;

        // Validate Bank Account Number
        function validateBankAccountNumber(accountNumber) {
            const cleanedAccountNumber = accountNumber.replace(/[\s-]/g, '');
            return /^\d{9,18}$/.test(cleanedAccountNumber);
        }

        if (!validateBankAccountNumber(recipient)) {
            alert('Please enter a valid bank account number (9-18 digits)');
            return;
        }

        // Basic validation
        if (!recipient || !amount || !paymentMethod) {
            alert('Please fill in all required fields');
            return;
        }

        // Check transfer limit
        if (amount > 100000) {
            alert('Transfer amount cannot exceed ₹1,00,000 per day');
            return;
        }

        // Simulate transaction processing
        const isSendMoney = paymentForm.querySelector('button[type="submit"]').textContent.includes('Transfer');
        const transactionType = isSendMoney ? 'send' : 'request';
        
        // Simulate transaction delay and processing
        const processingOverlay = document.createElement('div');
        processingOverlay.classList.add('processing-overlay');
        processingOverlay.innerHTML = `
            <div class="processing-content">
                <div class="spinner"></div>
                <p>${isSendMoney ? 'Transferring' : 'Requesting'} funds...</p>
            </div>
        `;
        document.body.appendChild(processingOverlay);

        // Simulate network delay
        setTimeout(() => {
            // Remove processing overlay
            document.body.removeChild(processingOverlay);

            // Simulate transaction success
            const confirmMessage = isSendMoney 
                ? `Successfully transferred ₹${amount.toLocaleString()} to Account ${recipient}`
                : `Money request of ₹${amount.toLocaleString()} sent to Account ${recipient}`;
            
            alert(confirmMessage);
            
            // Add transaction to history
            addTransactionToHistory(
                transactionType, 
                recipient, 
                amount, 
                description
            );
            
            // Reset form and hide payment gateway
            paymentFormTransactions.reset();
            paymentGateway.style.display = 'none';
        }, 2000); // 2-second simulated processing time
    });

    // Theme Switching Logic
    const themeSwitchBtn = document.getElementById('theme-switch');
    const themeIcon = themeSwitchBtn.querySelector('i');
    const themeText = themeSwitchBtn.querySelector('span');

    // Check for saved theme preference
    function getStoredTheme() {
        return localStorage.getItem('dashboard-theme') || 'light';
    }

    // Save theme preference
    function setStoredTheme(theme) {
        localStorage.setItem('dashboard-theme', theme);
    }

    // Apply theme
    function applyTheme(theme) {
        if (theme === 'dark') {
            document.body.classList.add('dark-mode');
            themeIcon.classList.remove('fa-moon');
            themeIcon.classList.add('fa-sun');
            themeText.textContent = 'Light Mode';
        } else {
            document.body.classList.remove('dark-mode');
            themeIcon.classList.remove('fa-sun');
            themeIcon.classList.add('fa-moon');
            themeText.textContent = 'Dark Mode';
        }
    }

    // Theme switch event listener
    themeSwitchBtn.addEventListener('click', () => {
        const currentTheme = getStoredTheme();
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        
        setStoredTheme(newTheme);
        applyTheme(newTheme);
    });

    // Apply stored theme on page load
    const storedTheme = getStoredTheme();
    applyTheme(storedTheme);
});
