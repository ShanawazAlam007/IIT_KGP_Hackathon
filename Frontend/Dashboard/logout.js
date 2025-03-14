// logout.js

// Function to handle user logout
function logout() {
    // Clear user session or token
    localStorage.removeItem('userToken');
    
    // Redirect to login page
    window.location.href = '../log_in_page/index.html';
}

// Attach logout function to logout button
document.getElementById('logout').addEventListener('click', logout);