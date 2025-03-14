document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    const EmailInput = document.getElementById('Email');
    const passwordInput = document.getElementById('password');
    const passwordToggle = document.querySelector('.password-toggle');
    const EmailIcon = document.querySelector('.input-icon');

    // Email validation
    EmailInput.addEventListener('input', () => {
        const Email = EmailInput.value.trim();
        const isValid = Email.length >= 3;
        
        EmailInput.classList.toggle('valid', isValid);
        EmailInput.classList.toggle('invalid', !isValid);
        
        EmailIcon.innerHTML = isValid 
            ? '<i class="fas fa-check-circle"></i>' 
            : '<i class="fas fa-times-circle"></i>';
    });

    // Password toggle visibility
    passwordToggle.addEventListener('click', () => {
        const type = passwordInput.type === 'password' ? 'text' : 'password';
        passwordInput.type = type;
        
        passwordToggle.innerHTML = type === 'password'
            ? '<i class="fas fa-eye-slash"></i>'
            : '<i class="fas fa-eye"></i>';
    });

    // Form submission
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const Email = EmailInput.value.trim();
        const password = passwordInput.value;
        
        // Basic client-side validation
        if (Email.length < 3) {
            alert('Please enter a valid Email');
            return;
        }
        
        if (password.length < 8) {
            alert('Password must be at least 8 characters long');
            return;
        }
        
        // Simulate login (replace with actual authentication logic)
        console.log('Login attempt:', { Email, password });
        

        // Send login details to server
        async function auth_user(){
            try{
            const response=await fetch('http://localhost:8080/auth/signin', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ Email, password })
                });
                if(response.status!==202){
                    throw new Error('Login failed');
                }
                const user_data=await response.json();
                console.log(user_data);
                alert('Login successful! Continuing to Dashboard...');
                localStorage.setItem("Token",user_data.token);
                window.location.href = '../dashboard_page/dashboard.html';
            }
            catch(error){
                console.error('Login failed:', error);
                alert('Login failed. Please try again');
            }

        }
        auth_user();

    });
});
