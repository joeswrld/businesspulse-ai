import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Menu, X, Zap, Sparkles, Rocket } from "lucide-react";

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navigation = [
    { name: "Features", href: "#features", icon: Zap },
    { name: "Pricing", href: "#pricing", icon: Sparkles },
    { name: "How It Works", href: "#how-it-works", icon: Rocket },
    { name: "Success Stories", href: "/testimonials", icon: Sparkles },
  ];

  return (
    <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
      scrolled 
        ? 'glass-effect border-b border-primary/20 shadow-lg' 
        : 'bg-transparent'
    }`}>
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-3 group">
            <div className="relative">
              <div className="w-12 h-12 bg-gradient-to-br from-primary via-secondary to-neon rounded-2xl flex items-center justify-center shadow-lg group-hover:shadow-glow transition-all duration-500 transform group-hover:scale-110">
                <img src="/favicon.ico" alt="NoteX" className="h-7 w-7" />
              </div>
              <div className="absolute -inset-1 bg-gradient-to-r from-primary to-secondary rounded-2xl blur opacity-20 group-hover:opacity-40 transition-opacity duration-500"></div>
            </div>
            <div className="flex flex-col">
              <span className="font-black text-2xl bg-gradient-to-r from-primary via-secondary to-neon bg-clip-text text-transparent">
                NoteX
              </span>
              <span className="text-xs text-muted-foreground font-medium">AI-Powered Insights</span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center space-x-8">
            {navigation.map((item, index) => (
              <a
                key={item.name}
                href={item.href}
                className="group flex items-center space-x-2 text-sm font-semibold text-muted-foreground hover:text-foreground transition-all duration-300 hover:scale-105"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <item.icon className="h-4 w-4 group-hover:text-primary transition-colors duration-300" />
                <span className="relative">
                  {item.name}
                  <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-gradient-to-r from-primary to-secondary group-hover:w-full transition-all duration-300"></span>
                </span>
              </a>
            ))}
          </nav>

          {/* CTA Buttons */}
          <div className="hidden lg:flex items-center space-x-4">
            <Button 
              variant="ghost" 
              size="lg" 
              className="group relative overflow-hidden hover:bg-primary/10 hover:text-primary transition-all duration-300"
              asChild
            >
              <Link to="/auth">
                <span className="relative z-10">Sign In</span>
                <div className="absolute inset-0 bg-gradient-to-r from-primary/0 via-primary/10 to-primary/0 transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
              </Link>
            </Button>
            <Button 
              variant="premium" 
              size="lg" 
              className="group relative overflow-hidden transform hover:scale-105 hover:shadow-premium transition-all duration-300"
              asChild
            >
              <Link to="/auth" className="flex items-center space-x-2">
                <Rocket className="h-5 w-5 group-hover:animate-bounce-gentle" />
                <span>Start Collecting Feedback</span>
                <Sparkles className="h-4 w-4 group-hover:animate-pulse-glow" />
              </Link>
            </Button>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="lg:hidden p-3 rounded-xl bg-gradient-to-r from-primary/10 to-secondary/10 hover:from-primary/20 hover:to-secondary/20 transition-all duration-300 group"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            {isMenuOpen ? (
              <X className="h-6 w-6 text-primary group-hover:text-secondary transition-colors duration-300" />
            ) : (
              <Menu className="h-6 w-6 text-primary group-hover:text-secondary transition-colors duration-300" />
            )}
          </button>
        </div>

        {/* Mobile Navigation */}
        {isMenuOpen && (
          <div className="lg:hidden py-6 space-y-4 border-t border-primary/20 bg-white/80 backdrop-blur-xl animate-fade-in">
            {navigation.map((item, index) => (
              <a
                key={item.name}
                href={item.href}
                className="flex items-center space-x-3 p-3 rounded-xl hover:bg-gradient-to-r hover:from-primary/10 hover:to-secondary/10 transition-all duration-300 group"
                onClick={() => setIsMenuOpen(false)}
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <item.icon className="h-5 w-5 text-primary group-hover:text-secondary transition-colors duration-300" />
                <span className="font-semibold text-foreground group-hover:text-primary transition-colors duration-300">
                  {item.name}
                </span>
              </a>
            ))}
            <div className="flex flex-col space-y-3 pt-4">
              <Button 
                variant="ghost" 
                size="lg" 
                className="w-full justify-center group hover:bg-primary/10 hover:text-primary transition-all duration-300"
                asChild
              >
                <Link to="/auth">Sign In</Link>
              </Button>
              <Button 
                variant="premium" 
                size="lg" 
                className="w-full justify-center group transform hover:scale-105 transition-all duration-300"
                asChild
              >
                <Link to="/auth" className="flex items-center justify-center space-x-2">
                  <Rocket className="h-5 w-5" />
                  <span>Start Collecting Feedback</span>
                  <Sparkles className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;