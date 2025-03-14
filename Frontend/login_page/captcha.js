document.addEventListener('DOMContentLoaded', () => {
    const captchaMathElement = document.getElementById('captcha-math');
    const captchaInput = document.getElementById('captcha-input');
    const loginButton = document.getElementById('login-btn');

    let correctAnswer = 0;
    let attempts = 0;
    const maxAttempts = 3;

    function generateCaptcha() {
        const operators = ['+', '-', '*'];
        const num1 = Math.floor(Math.random() * 10) + 1;
        const num2 = Math.floor(Math.random() * 10) + 1;
        const operator = operators[Math.floor(Math.random() * operators.length)];

        switch(operator) {
            case '+':
                correctAnswer = num1 + num2;
                break;
            case '-':
                correctAnswer = num1 - num2;
                break;
            case '*':
                correctAnswer = num1 * num2;
                break;
        }

        captchaMathElement.textContent = ` ${num1} ${operator} ${num2} = ?`;
        attempts = 0;
    }

    function validateCaptcha() {
        const userAnswer = parseInt(captchaInput.value);
        
        if (userAnswer === correctAnswer) {
            loginButton.disabled = false;
            captchaInput.classList.remove('error');
            captchaInput.classList.add('success');
            captchaMathElement.style.backgroundColor = '#22c55e';
            attempts = 0;
        } else {
            attempts++;
            loginButton.disabled = true;
            captchaInput.classList.remove('success');
            captchaInput.classList.add('error');
            captchaMathElement.style.backgroundColor = '#ef4444';

            if (attempts >= maxAttempts) {
                captchaMathElement.textContent = ' Too many attempts!';
                captchaInput.disabled = true;
                setTimeout(() => {
                    generateCaptcha();
                    captchaInput.disabled = false;
                    captchaInput.value = '';
                    captchaInput.classList.remove('error', 'success');
                    captchaMathElement.style.backgroundColor = '#2563eb';
                }, 2000);
            }
        }
    }

    // Initial captcha generation
    generateCaptcha();

    // Validate captcha on input
    captchaInput.addEventListener('input', validateCaptcha);

    // Regenerate captcha if needed
    captchaMathElement.addEventListener('click', generateCaptcha);
});
