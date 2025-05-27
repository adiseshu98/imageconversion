// Get theme from localStorage or default to dark
const getStoredTheme = () => localStorage.getItem('theme') || 'dark';

// Apply theme to document
const applyTheme = (theme) => {
    document.documentElement.setAttribute('data-bs-theme', theme);
    localStorage.setItem('theme', theme);
    
    // Update icon
    const icon = document.querySelector('#themeToggle i');
    if (icon) {
        // Show sun for dark theme (indicating you can switch to light)
        // Show moon for light theme (indicating you can switch to dark)
        icon.className = theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
    }
};

// Toggle theme
const toggleTheme = () => {
    const currentTheme = document.documentElement.getAttribute('data-bs-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    applyTheme(newTheme);
};

// Initialize theme immediately before page loads
const initialTheme = getStoredTheme();
document.documentElement.setAttribute('data-bs-theme', initialTheme);

// Listen for theme changes from other pages
window.addEventListener('storage', (e) => {
    if (e.key === 'theme') {
        applyTheme(e.newValue || 'dark');
    }
});

// Initialize theme toggle after DOM loads
document.addEventListener('DOMContentLoaded', () => {
    // Update initial icon
    applyTheme(getStoredTheme());
    
    // Add click handler to theme toggle button
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', toggleTheme);
    }
}); 