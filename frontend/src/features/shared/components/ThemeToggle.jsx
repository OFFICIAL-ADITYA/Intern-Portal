export default function ThemeToggle({ theme, onToggle }) {
  return (
    <button 
      className="theme-toggle" 
      onClick={onToggle} 
      type="button"
      title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
    >
      {theme === 'dark' ? '☀️' : '🌙'}
    </button>
  );
}