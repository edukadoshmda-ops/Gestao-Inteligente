import { useState, useEffect } from 'react';

interface LogoProps {
  className?: string;
  variant?: 'default' | 'white';
  logoUrl?: string;
  forceDefault?: boolean;
}

export default function Logo({ className, variant = 'default', logoUrl, forceDefault = false }: LogoProps) {
  const isWhite = variant === 'white';
  const [customLogo, setCustomLogo] = useState<string | null>(null);

  useEffect(() => {
    if (forceDefault) return;

    // Carrega a logo salva no localStorage
    const savedLogo = localStorage.getItem('@AppGestao:savedLogo');
    if (savedLogo) {
      setCustomLogo(savedLogo);
    }

    // Listener para atualizações de logo na mesma aba/sessão
    const handleLogoUpdate = () => {
      const updated = localStorage.getItem('@AppGestao:savedLogo');
      setCustomLogo(updated);
    };

    window.addEventListener('logoUpdated', handleLogoUpdate);
    window.addEventListener('storage', handleLogoUpdate);

    return () => {
      window.removeEventListener('logoUpdated', handleLogoUpdate);
      window.removeEventListener('storage', handleLogoUpdate);
    };
  }, [forceDefault]);

  const displayLogo = forceDefault ? "/logo app.png" : (logoUrl || customLogo || "/logo app.png");
  const isDefault = displayLogo === "/logo app.png";

  return (
    <div className={`relative flex items-center justify-center ${className}`}>
      <img 
        src={displayLogo} 
        alt="Plataforma Eleitoral" 
        className="w-full h-full object-contain transition-all duration-300 scale-[1.2]"
        style={{
          filter: (isWhite && isDefault) ? 'brightness(0) invert(1)' : 'none'
        }}
      />
    </div>
  );
}
