import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export const IntroPage: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const timer = setTimeout(() => {
      navigate('/storyboard');
    }, 4500); // 4.5 seconds for the full intro animation

    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <div className="intro-page-wrapper">
      <style>{`
        .intro-page-wrapper {
          position: fixed;
          inset: 0;
          z-index: 9999;
          background: #0f172a;
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: 'Poppins', sans-serif;
          overflow: hidden;
        }

        .ambient-light {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 45vw;
          height: 45vw;
          background: radial-gradient(circle, rgba(56, 189, 248, 0.15) 0%, transparent 60%);
          z-index: 0;
          pointer-events: none;
        }

        .portal-text-container {
          opacity: 0;
          animation: fade-down-intro 1.2s ease-out 0.8s forwards;
        }

        @keyframes fade-down-intro {
          0% { opacity: 0; transform: translateY(-40px); letter-spacing: 0px; }
          100% { opacity: 1; transform: translateY(0); }
        }

        .logo-wrapper-intro {
          perspective: 1000px;
          animation: entrance-intro 1.5s ease-out forwards;
        }

        .logo-intro {
          width: 220px;
          height: auto;
          animation: spin-glow-intro 2.5s ease-out 0.5s forwards;
          transform-style: preserve-3d;
        }

        @keyframes entrance-intro {
          0% { opacity: 0; transform: scale(0) translateY(-100px); }
          70% { transform: scale(1.1) translateY(10px); }
          100% { opacity: 1; transform: scale(1) translateY(0); }
        }

        @keyframes spin-glow-intro {
          0% { transform: rotateY(0deg); filter: drop-shadow(0 10px 15px rgba(0, 0, 0, 0.5)); }
          50% { transform: rotateY(180deg); filter: drop-shadow(0 20px 30px rgba(56, 189, 248, 0.4)) drop-shadow(0 0 20px rgba(253, 224, 71, 0.3)); }
          100% { transform: rotateY(360deg); filter: drop-shadow(0 10px 15px rgba(0, 0, 0, 0.5)); }
        }

        .text-container-intro {
          opacity: 0;
          animation: fade-up-intro 1.2s ease-out 1s forwards;
        }

        .text-bapperida-intro {
          background: linear-gradient(to right, #60a5fa, #e0e7ff, #93c5fd, #3b82f6);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-size: 200% auto;
          animation: text-shine-intro 4s linear infinite;
          font-size: 3rem;
          font-weight: 800;
          letter-spacing: 0.1em;
          margin-bottom: 0.5rem;
        }

        @keyframes fade-up-intro {
          0% { opacity: 0; transform: translateY(40px); letter-spacing: 0px; }
          100% { opacity: 1; transform: translateY(0); }
        }

        @keyframes text-shine-intro {
          to { background-position: 200% center; }
        }

        .divider-intro {
          height: 4px;
          width: 6rem;
          background: linear-gradient(to right, transparent, #facc15, transparent);
          margin: 1rem auto;
          border-radius: 9999px;
        }

        .subtitle-intro {
          font-size: 1.125rem;
          font-weight: 600;
          color: #bfdbfe;
          letter-spacing: 0.3em;
          text-transform: uppercase;
          opacity: 0.9;
        }

        .portal-title-intro {
          font-size: 1.5rem;
          font-weight: 700;
          background: linear-gradient(to right, #22d3ee, #3b82f6);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          letter-spacing: 0.3em;
          text-transform: uppercase;
          margin-bottom: 1.5rem;
        }
      `}</style>
      
      <div className="ambient-light"></div>

      <div className="z-10 flex flex-col items-center text-center px-4">
        <div className="portal-text-container">
          <h3 className="portal-title-intro">
            PORTAL AI
          </h3>
        </div>

        <div className="logo-wrapper-intro mb-10">
          <img 
            src="/assets/Logo Lobar Blue.png" 
            alt="Logo Kabupaten Lombok Barat" 
            className="logo-intro" 
          />
        </div>
        
        <div className="text-container-intro">
          <h1 className="text-bapperida-intro">
            BAPPERIDA
          </h1>
          <div className="divider-intro"></div>
          <h2 className="subtitle-intro">
            Kabupaten Lombok Barat
          </h2>
        </div>
      </div>
    </div>
  );
};
