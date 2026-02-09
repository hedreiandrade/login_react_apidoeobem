// src/components/Footer.js
import React, { useState, useEffect } from "react";
import { FaSearch, FaUser } from "react-icons/fa";
import { IoMdHome } from "react-icons/io";
import { Link, useLocation } from "react-router-dom";
import '../styles/Footer.css';

export default function Footer({ showOnScroll = true }) {
  const [isVisible, setIsVisible] = useState(true);
  const location = useLocation();
  const userId = localStorage.getItem('user_id');

  // Lógica do scroll
  useEffect(() => {
    if (!showOnScroll) {
      setIsVisible(true);
      return;
    }

    let lastScrollY = window.pageYOffset;
    let ticking = false;

    const handleScroll = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          const currentScrollY = window.pageYOffset;
          
          // Scroll para baixo - esconde
          if (currentScrollY > lastScrollY && currentScrollY > 100) {
            setIsVisible(false);
          } 
          // Scroll para cima - mostra
          else if (currentScrollY < lastScrollY) {
            setIsVisible(true);
          }
          
          lastScrollY = currentScrollY;
          ticking = false;
        });
        
        ticking = true;
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [showOnScroll]);

  // Footer flutuante (igual X/Twitter)
  const FloatingFooter = () => (
    <footer className={`footer-fixed ${!isVisible ? 'footer-hidden' : ''}`}>
      <div className="footer-container">
        <Link 
          to="/feed" 
          className={`footer-link ${location.pathname === '/feed' ? 'active' : ''}`}
        >
          <div className="footer-icon">
            <IoMdHome />
          </div>
          <span className="footer-label">
            Home
          </span>
        </Link>

        <Link 
          to="/search" 
          className={`footer-link ${location.pathname === '/search' ? 'active' : ''}`}
        >
          <div className="footer-icon">
            <FaSearch />
          </div>
          <span className="footer-label">
            Search
          </span>
        </Link>

        <Link 
          to={`/profile/${userId}`} 
          className={`footer-link ${location.pathname === '/edit-profile' ? 'active' : ''}`}
        >
          <div className="footer-icon">
            <FaUser />
          </div>
          <span className="footer-label">
            Profile
          </span>
        </Link>
      </div>
    </footer>
  );

  // Footer original (não flutuante)
  const OriginalFooter = () => (
    <footer className="footer-original">
      <p>&copy; 2025 - Hedrei Andrade</p>
    </footer>
  );

  if (!showOnScroll) {
    return <OriginalFooter />;
  }

  return <FloatingFooter />;
}