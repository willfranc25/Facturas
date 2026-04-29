import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import { MobileHeader } from './MobileHeader';

interface AppLayoutProps {
  children: React.ReactNode;
}

export const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Desktop Sidebar - visible on screens >= 768px */}
      <div className="hidden md:block">
        <Sidebar />
      </div>

      {/* Mobile Header - visible on screens < 768px */}
      <div className="md:hidden">
        <MobileHeader
          isMenuOpen={isMobileMenuOpen}
          onToggleMenu={toggleMobileMenu}
          onCloseMenu={closeMobileMenu}
        />
      </div>

      {/* Main Content Area */}
      <div className="md:ml-64">
        <main className="p-4 md:p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
};
