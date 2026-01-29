'use client';

import React, { useEffect, useRef, useCallback } from 'react';

export interface InPostPoint {
  name: string;
  address: {
    line1: string;
    line2: string;
  };
  address_details: {
    city: string;
    street: string;
    building_number: string;
    flat_number?: string;
    post_code: string;
    province: string;
  };
  location: {
    latitude: number;
    longitude: number;
  };
  location_description?: string;
  opening_hours?: string;
  type: string[];
}

interface InPostGeoWidgetProps {
  isOpen: boolean;
  onClose: () => void;
  onPointSelect: (point: InPostPoint) => void;
  token?: string;
}

// Domyślny publiczny token dla testów - zamień na swój produkcyjny
const DEFAULT_TOKEN = process.env.NEXT_PUBLIC_INPOST_GEOWIDGET_TOKEN || 'eyJhbGciOiJSUzI1NiIsInR5cCIgOiAiSldUIiwia2lkIiA6ICJzQlpXVzFNZzVlQnpDYU1XU3JvTlBjRWFveFpXcW9Ua2FuZVB3X291LWxvIn0.eyJleHAiOjIwMzQyNDc0MDQsImlhdCI6MTcxODg4NzQwNCwianRpIjoiMmZhNWI5YTktZjhhNS00ZWI4LTljNjgtZjJkN2JiNmJhZmI3IiwiaXNzIjoiaHR0cHM6Ly9sb2dpbi5pbnBvc3QucGwvYXV0aC9yZWFsbXMvZXh0ZXJuYWwiLCJzdWIiOiJmOjEyNDc1MDUxLTFjMDMtNGU1OS1iYTBjLTJiNDU2OTVlZjUzNTpncGwtbWFwLXdpZGdldC10b2tlbiIsInR5cCI6IkJlYXJlciIsImF6cCI6InNoaXB4LWFwcC13aWRnZXRzIiwiYWxsb3dlZC1vcmlnaW5zIjpbIioiXSwic2NvcGUiOiJvcGVuaWQgYXBpOmFwaXBvaW50cyIsInNpZCI6IjM5ZjI3MjFiLTkyYjUtNGMwNC04YTNjLTYxYWZiZjMzYjE2NyIsImNsaWVudEhvc3QiOiIxNzIuMjYuMTAuMjM1IiwiY2xpZW50QWRkcmVzcyI6IjE3Mi4yNi4xMC4yMzUiLCJjbGllbnRfaWQiOiJzaGlweC1hcHAtd2lkZ2V0cyJ9.nS8CZjQC_6yxKQKvQdh2mJzW-kQqZw6gxEJQjB7YfQ3VLCEbTZCEGlnD6QMXwqOblFf-zCHGV8H9y7nqgXYD_e89SQnJF6GqFy_hJ6YLsQ';

export default function InPostGeoWidget({ isOpen, onClose, onPointSelect, token = DEFAULT_TOKEN }: InPostGeoWidgetProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const scriptLoadedRef = useRef(false);
  const eventHandlerIdRef = useRef<string>(`inpost_handler_${Date.now()}`);

  // Handle point selection
  const handlePointSelected = useCallback((event: Event) => {
    const customEvent = event as CustomEvent<InPostPoint>;
    if (customEvent.detail) {
      onPointSelect(customEvent.detail);
      onClose();
    }
  }, [onPointSelect, onClose]);

  // Load InPost scripts
  useEffect(() => {
    if (scriptLoadedRef.current) return;

    // Add CSS
    if (!document.querySelector('link[href*="inpost-geowidget.css"]')) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'https://geowidget.inpost.pl/inpost-geowidget.css';
      document.head.appendChild(link);
    }

    // Add JS
    if (!document.querySelector('script[src*="inpost-geowidget.js"]')) {
      const script = document.createElement('script');
      script.src = 'https://geowidget.inpost.pl/inpost-geowidget.js';
      script.defer = true;
      document.head.appendChild(script);
    }

    scriptLoadedRef.current = true;
  }, []);

  // Setup event listener
  useEffect(() => {
    const handlerId = eventHandlerIdRef.current;
    
    // Register global handler
    (window as any)[handlerId] = (point: InPostPoint) => {
      onPointSelect(point);
      onClose();
    };

    // Also listen for custom event
    document.addEventListener(handlerId, handlePointSelected);

    return () => {
      delete (window as any)[handlerId];
      document.removeEventListener(handlerId, handlePointSelected);
    };
  }, [handlePointSelected, onPointSelect, onClose]);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  // Create geowidget element dynamically
  const geoWidgetContainerRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (!isOpen || !geoWidgetContainerRef.current) return;
    
    const container = geoWidgetContainerRef.current;
    const handlerId = eventHandlerIdRef.current;
    
    // Clear any existing content
    container.innerHTML = '';
    
    // Create geowidget element
    const geowidget = document.createElement('inpost-geowidget');
    geowidget.setAttribute('token', token);
    geowidget.setAttribute('language', 'pl');
    geowidget.setAttribute('config', 'parcelCollect');
    geowidget.setAttribute('onpoint', handlerId);
    geowidget.style.width = '100%';
    geowidget.style.height = '100%';
    geowidget.style.display = 'block';
    
    container.appendChild(geowidget);
    
    return () => {
      container.innerHTML = '';
    };
  }, [isOpen, token]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      
      {/* Modal */}
      <div 
        ref={containerRef}
        className="relative bg-white dark:bg-secondary-800 rounded-xl shadow-2xl w-[95vw] h-[90vh] max-w-[1200px] max-h-[800px] overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b bg-gradient-to-r from-[#FFCD00] to-[#FFD700]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#1D1D1B] rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-[#FFCD00]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-bold text-[#1D1D1B]">Wybierz Paczkomat</h2>
              <p className="text-sm text-[#1D1D1B]/70">Znajdź najbliższy punkt odbioru</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-[#1D1D1B]/10 hover:bg-[#1D1D1B]/20 flex items-center justify-center transition-colors"
            aria-label="Zamknij"
          >
            <svg className="w-6 h-6 text-[#1D1D1B]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        {/* GeoWidget Container */}
        <div 
          ref={geoWidgetContainerRef}
          className="w-full h-[calc(100%-72px)]"
        />
      </div>
    </div>
  );
}
