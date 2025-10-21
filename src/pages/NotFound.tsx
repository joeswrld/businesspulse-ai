import { useLocation, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Home, Search, ArrowLeft, Moon, Sun, Sparkles } from "lucide-react";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [darkMode, setDarkMode] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );

    // Check for saved theme preference
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') {
      setDarkMode(true);
      document.documentElement.classList.add('dark');
    }
  }, [location.pathname]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  const toggleDarkMode = () => {
    if (darkMode) {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
      setDarkMode(false);
    } else {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
      setDarkMode(true);
    }
  };

  const parallaxX = (mousePosition.x - window.innerWidth / 2) / 50;
  const parallaxY = (mousePosition.y - window.innerHeight / 2) / 50;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 dark:from-gray-950 dark:via-blue-950 dark:to-purple-950 transition-colors duration-300 overflow-hidden relative">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div 
          className="absolute top-1/4 left-1/4 w-64 h-64 bg-blue-300/20 dark:bg-blue-600/10 rounded-full blur-3xl animate-pulse"
          style={{ transform: `translate(${parallaxX}px, ${parallaxY}px)` }}
        />
        <div 
          className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-300/20 dark:bg-purple-600/10 rounded-full blur-3xl animate-pulse"
          style={{ 
            transform: `translate(${-parallaxX}px, ${-parallaxY}px)`,
            animationDelay: '1s' 
          }}
        />
        <div 
          className="absolute top-1/2 left-1/2 w-72 h-72 bg-pink-300/20 dark:bg-pink-600/10 rounded-full blur-3xl animate-pulse"
          style={{ 
            transform: `translate(${parallaxX * 1.5}px, ${parallaxY * 1.5}px)`,
            animationDelay: '2s' 
          }}
        />
      </div>

      {/* Dark mode toggle */}
      <Button
        onClick={toggleDarkMode}
        variant="ghost"
        size="icon"
        className="absolute top-6 right-6 z-50 text-gray-700 dark:text-gray-300 hover:bg-white/50 dark:hover:bg-gray-800/50"
      >
        {darkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
      </Button>

      {/* Main content */}
      <div className="text-center relative z-10 px-4 max-w-2xl mx-auto">
        {/* Animated 404 */}
        <div className="relative mb-8">
          <h1 
            className="text-[150px] sm:text-[200px] font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 dark:from-blue-400 dark:via-purple-400 dark:to-pink-400 leading-none animate-bounce"
            style={{ 
              animationDuration: '2s',
              textShadow: darkMode 
                ? '0 0 80px rgba(147, 51, 234, 0.5)' 
                : '0 0 80px rgba(147, 51, 234, 0.3)'
            }}
          >
            404
          </h1>
          
          {/* Floating sparkles */}
          <Sparkles 
            className="absolute top-0 left-1/4 text-yellow-400 animate-ping" 
            style={{ animationDuration: '2s' }}
          />
          <Sparkles 
            className="absolute top-1/4 right-1/4 text-pink-400 animate-ping" 
            style={{ animationDuration: '2.5s', animationDelay: '0.5s' }}
          />
          <Sparkles 
            className="absolute bottom-0 right-1/3 text-purple-400 animate-ping" 
            style={{ animationDuration: '3s', animationDelay: '1s' }}
          />
        </div>

        {/* Animated text */}
        <div className="space-y-4 mb-8">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white animate-fade-in">
            Oops! Lost in Space
          </h2>
          <p className="text-lg sm:text-xl text-gray-600 dark:text-gray-400 animate-fade-in" style={{ animationDelay: '0.2s' }}>
            The page you're looking for seems to have wandered off into the digital void.
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-500 animate-fade-in" style={{ animationDelay: '0.4s' }}>
            Error path: <code className="bg-gray-200 dark:bg-gray-800 px-2 py-1 rounded text-xs">{location.pathname}</code>
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center animate-fade-in" style={{ animationDelay: '0.6s' }}>
          <Button
            onClick={() => navigate('/')}
            size="lg"
            className="group bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300"
          >
            <Home className="h-5 w-5 mr-2 group-hover:rotate-12 transition-transform" />
            Back to Home
          </Button>

          <Button
            onClick={() => navigate(-1)}
            size="lg"
            variant="outline"
            className="group border-2 border-gray-300 dark:border-gray-700 hover:border-purple-500 dark:hover:border-purple-500 bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm hover:bg-white dark:hover:bg-gray-800 transform hover:scale-105 transition-all duration-300"
          >
            <ArrowLeft className="h-5 w-5 mr-2 group-hover:-translate-x-1 transition-transform" />
            Go Back
          </Button>

          <Button
            onClick={() => navigate('/help')}
            size="lg"
            variant="outline"
            className="group border-2 border-gray-300 dark:border-gray-700 hover:border-pink-500 dark:hover:border-pink-500 bg-white/50 dark:bg-gray-800/50 backdrop-blur-sm hover:bg-white dark:hover:bg-gray-800 transform hover:scale-105 transition-all duration-300"
          >
            <Search className="h-5 w-5 mr-2 group-hover:rotate-12 transition-transform" />
            Get Help
          </Button>
        </div>

        {/* Playful ASCII art */}
        <div className="mt-12 text-gray-400 dark:text-gray-600 text-xs sm:text-sm font-mono animate-fade-in" style={{ animationDelay: '0.8s' }}>
          <pre className="inline-block text-left">
{`    ¯\\_(ツ)_/¯
   404 Not Found`}
          </pre>
        </div>
      </div>

      <style>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .animate-fade-in {
          animation: fade-in 0.6s ease-out forwards;
          opacity: 0;
        }
      `}</style>
    </div>
  );
};

export default NotFound;