import { Zap, Mail, Twitter, Linkedin, Github, Sparkles, Rocket, Brain, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const Footer = () => {
  const navigation = {
    product: [
      { name: "Dashboard", href: "/dashboard", icon: Zap },
      { name: "AI Insights", href: "/insights-simple", icon: Brain },
      { name: "Analytics", href: "/analytics", icon: TrendingUp },
      { name: "Reports", href: "/reports", icon: TrendingUp },
      { name: "Integrations", href: "/integrations", icon: Zap },
      { name: "API", href: "/api", icon: Zap },
    ],
    company: [
      { name: "About", href: "/about", icon: Sparkles },
      { name: "Help Center", href: "/help", icon: Zap },
      { name: "Privacy Policy", href: "/privacy-policy", icon: Zap },
      { name: "Terms of Service", href: "/terms-of-service", icon: Zap },
    ],
  };

  const social = [
    { name: "Twitter", href: "#", icon: Twitter, color: "hover:text-blue-400" },
    { name: "LinkedIn", href: "#", icon: Linkedin, color: "hover:text-blue-600" },
    { name: "GitHub", href: "#", icon: Github, color: "hover:text-gray-600" },
  ];

  return (
    <footer className="relative bg-gradient-to-br from-secondary/5 via-primary/5 to-neon/5 overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,hsl(262_83%_58%_0.1),transparent_50%)]"></div>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,hsl(14_100%_57%_0.1),transparent_50%)]"></div>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_90%_10%,hsl(187_100%_50%_0.1),transparent_50%)]"></div>
      
      <div className="container mx-auto px-4 relative z-10">
        {/* Main Footer Content */}
        <div className="py-20">
          <div className="grid lg:grid-cols-4 gap-12">
            {/* Brand Section */}
            <div className="lg:col-span-2 space-y-8">
              <div className="flex items-center space-x-4 group">
                <div className="relative">
                  <div className="w-16 h-16 bg-gradient-to-br from-primary via-secondary to-neon rounded-3xl flex items-center justify-center shadow-lg group-hover:shadow-glow transition-all duration-500 transform group-hover:scale-110">
                    <img src="/favicon.ico" alt="NoteX" className="h-10 w-10" />
                  </div>
                  <div className="absolute -inset-2 bg-gradient-to-r from-primary to-secondary rounded-3xl blur opacity-20 group-hover:opacity-40 transition-opacity duration-500"></div>
                </div>
                <div className="flex flex-col">
                  <span className="font-black text-3xl bg-gradient-to-r from-primary via-secondary to-neon bg-clip-text text-transparent">
                    NoteX
                  </span>
                  <span className="text-sm text-muted-foreground font-medium">AI-Powered Insights Platform</span>
                </div>
              </div>
              
              <p className="text-muted-foreground/80 max-w-lg text-lg leading-relaxed">
                Transform customer feedback into actionable insights with our AI-powered analytics platform. 
                Understand your customers better and drive growth through data-driven decisions.
              </p>
              
              {/* Contact Info */}
              <div className="space-y-4">
                <div className="flex items-center space-x-4 text-sm group">
                  <div className="w-10 h-10 bg-gradient-to-r from-primary/10 to-secondary/10 rounded-xl flex items-center justify-center group-hover:from-primary/20 group-hover:to-secondary/20 transition-all duration-300">
                    <Mail className="h-5 w-5 text-primary group-hover:text-secondary transition-colors duration-300" />
                  </div>
                  <span className="font-medium group-hover:text-primary transition-colors duration-300">hello@notex.com</span>
                </div>
              </div>
            </div>

            {/* Navigation Links */}
            <div className="lg:col-span-2 grid md:grid-cols-2 gap-8">
              <div className="space-y-6">
                <h3 className="text-xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                  Product
                </h3>
                <ul className="space-y-4">
                  {navigation.product.map((item, index) => (
                    <li key={item.name}>
                      <Link
                        to={item.href}
                        className="group flex items-center space-x-3 text-muted-foreground hover:text-foreground transition-all duration-300 hover:translate-x-2"
                        style={{ animationDelay: `${index * 100}ms` }}
                      >
                        <item.icon className="h-4 w-4 text-primary group-hover:text-secondary transition-colors duration-300" />
                        <span className="font-medium">{item.name}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="space-y-6">
                <h3 className="text-xl font-bold bg-gradient-to-r from-secondary to-neon bg-clip-text text-transparent">
                  Company
                </h3>
                <ul className="space-y-4">
                  {navigation.company.map((item, index) => (
                    <li key={item.name}>
                      <Link
                        to={item.href}
                        className="group flex items-center space-x-3 text-muted-foreground hover:text-foreground transition-all duration-300 hover:translate-x-2"
                        style={{ animationDelay: `${index * 100}ms` }}
                      >
                        <item.icon className="h-4 w-4 text-secondary group-hover:text-neon transition-colors duration-300" />
                        <span className="font-medium">{item.name}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Newsletter Section */}
        <div className="py-12 border-t border-primary/20">
          <div className="max-w-4xl mx-auto text-center space-y-8">
            <div className="space-y-4">
              <h3 className="text-3xl font-bold bg-gradient-to-r from-primary via-secondary to-neon bg-clip-text text-transparent">
                Stay Updated ✨
              </h3>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                Get the latest insights, product updates, and AI breakthroughs delivered to your inbox.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto">
              <input
                type="email"
                placeholder="Enter your email"
                className="flex-1 px-6 py-4 rounded-2xl bg-white/80 backdrop-blur-xl border-2 border-primary/20 text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-primary focus:shadow-glow transition-all duration-300 transform focus:scale-105"
              />
              <Button 
                variant="premium" 
                size="lg" 
                className="group relative overflow-hidden transform hover:scale-105 hover:shadow-premium transition-all duration-300"
              >
                <span className="relative z-10">Subscribe</span>
                <div className="absolute inset-0 bg-gradient-to-r from-primary/0 via-white/20 to-primary/0 transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
              </Button>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="py-8 border-t border-primary/20">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="text-sm text-muted-foreground">
              © 2024 NoteX. All rights reserved. Built with ❤️ and AI.
            </div>
            
            {/* Social Links */}
            <div className="flex items-center space-x-6">
              {social.map((item) => (
                <a
                  key={item.name}
                  href={item.href}
                  className={`w-12 h-12 bg-gradient-to-r from-primary/10 to-secondary/10 rounded-2xl flex items-center justify-center transition-all duration-300 hover:from-primary/20 hover:to-secondary/20 hover:scale-110 hover:shadow-glow ${item.color}`}
                >
                  <span className="sr-only">{item.name}</span>
                  <item.icon className="h-5 w-5 text-primary" />
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;