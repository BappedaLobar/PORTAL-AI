import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, ChevronLeft, Play, Activity, Shield, BarChart, Zap } from 'lucide-react';

const slides = [
  {
    id: 1,
    title: "Analisis Cerdas & Terintegrasi",
    description: "Portal AI mengolah ribuan data SIRUP dan RUP secara otomatis untuk memberikan pandangan mendalam terhadap belanja daerah Anda dalam hitungan detik.",
    image: "/assets/storyboard/slide1.png",
    icon: <Activity className="w-6 h-6 text-blue-400" />
  },
  {
    id: 2,
    title: "Deteksi Dini & Mitigasi Risiko",
    description: "Identifikasi potensi anomali dan pastikan setiap paket pengadaan mematuhi regulasi dengan bantuan mesin kecerdasan buatan yang akurat.",
    image: "/assets/storyboard/slide2.png",
    icon: <Shield className="w-6 h-6 text-orange-400" />
  },
  {
    id: 3,
    title: "Wawasan Strategis Berbasis Data",
    description: "Transformasi data mentah menjadi visualisasi interaktif yang memudahkan pengambilan keputusan strategis bagi pimpinan daerah.",
    image: "/assets/storyboard/slide3.png",
    icon: <BarChart className="w-6 h-6 text-purple-400" />
  }
];

export const StoryboardPage: React.FC = () => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isExiting, setIsExiting] = useState(false);
  const navigate = useNavigate();

  const handleNext = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(prev => prev + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrev = () => {
    if (currentSlide > 0) {
      setCurrentSlide(prev => prev - 1);
    }
  };

  const handleComplete = () => {
    setIsExiting(true);
    localStorage.setItem('storyboard_seen', 'true');
    setTimeout(() => {
      navigate('/');
    }, 500);
  };

  return (
    <div className={`storyboard-overlay ${isExiting ? 'animate-fade-out' : ''}`}>
      <div className="storyboard-container">
        <div className="storyboard-content">
          <div className="storyboard-image-container">
            <img 
              src={slides[currentSlide].image} 
              alt={slides[currentSlide].title} 
              className="storyboard-image slide-active"
              key={`img-${currentSlide}`}
            />
          </div>
          
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-white/5 border border-white/10">
              {slides[currentSlide].icon}
            </div>
            <span className="text-xs font-bold uppercase tracking-widest text-blue-400">Portal AI Analysis</span>
          </div>

          <h1 className="storyboard-text-h" key={`title-${currentSlide}`}>
            {slides[currentSlide].title}
          </h1>
          
          <p className="storyboard-text-p" key={`desc-${currentSlide}`}>
            {slides[currentSlide].description}
          </p>
        </div>

        <div className="storyboard-footer">
          <div className="storyboard-dots">
            {slides.map((_, idx) => (
              <div 
                key={idx} 
                className={`storyboard-dot ${idx === currentSlide ? 'active' : ''}`}
                onClick={() => setCurrentSlide(idx)}
                style={{ cursor: 'pointer' }}
              />
            ))}
          </div>

          <div className="storyboard-nav-btns">
            {currentSlide > 0 && (
              <button className="btn btn-secondary" onClick={handlePrev}>
                <ChevronLeft className="w-4 h-4" />
                Kembali
              </button>
            )}
            
            <button className="btn btn-primary btn-lg" onClick={handleNext}>
              {currentSlide === slides.length - 1 ? (
                <>
                  Mulai Analisis
                  <Play className="w-4 h-4" />
                </>
              ) : (
                <>
                  Lanjut
                  <ChevronRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>

        {/* Skip button top right */}
        <button 
          className="absolute top-6 right-6 text-xs text-white/40 hover:text-white transition-colors"
          onClick={handleComplete}
        >
          Lewati Storyboard
        </button>
      </div>
    </div>
  );
};
