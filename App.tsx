
import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { APPLE_PRESETS, Dimension, ResizeMode, ImageState } from './types';
import { analyzeScreenshotColors } from './services/geminiService';

const App: React.FC = () => {
  const [images, setImages] = useState<ImageState[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [targetDimension, setTargetDimension] = useState<Dimension>(APPLE_PRESETS[0]);
  const [resizeMode, setResizeMode] = useState<ResizeMode>('contain');
  const [bgColor, setBgColor] = useState('#ffffff');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const selectedImage = useMemo(() => 
    images.find(img => img.id === selectedId) || null
  , [images, selectedId]);

  const processSingleImage = useCallback(async (imgSource: HTMLImageElement, dimension: Dimension, mode: ResizeMode, background: string): Promise<string | null> => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    canvas.width = dimension.width;
    canvas.height = dimension.height;

    // Fill background
    ctx.fillStyle = background;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const imgWidth = imgSource.width;
    const imgHeight = imgSource.height;
    const imgAspect = imgWidth / imgHeight;
    const targetAspect = dimension.width / dimension.height;

    let drawWidth = dimension.width;
    let drawHeight = dimension.height;
    let offsetX = 0;
    let offsetY = 0;

    if (mode === 'contain') {
      if (imgAspect > targetAspect) {
        drawHeight = dimension.width / imgAspect;
        offsetY = (dimension.height - drawHeight) / 2;
      } else {
        drawWidth = dimension.height * imgAspect;
        offsetX = (dimension.width - drawWidth) / 2;
      }
    } else if (mode === 'cover') {
      if (imgAspect > targetAspect) {
        drawWidth = dimension.height * imgAspect;
        offsetX = (dimension.width - drawWidth) / 2;
      } else {
        drawHeight = dimension.width / imgAspect;
        offsetY = (dimension.height - drawHeight) / 2;
      }
    }

    ctx.drawImage(imgSource, offsetX, offsetY, drawWidth, drawHeight);
    return canvas.toDataURL('image/png');
  }, []);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files: File[] = Array.from(e.target.files || []);
    if (files.length === 0) return;

    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = async () => {
          const newImage: ImageState = {
            id: Math.random().toString(36).substr(2, 9),
            originalUrl: event.target?.result as string,
            processedUrl: null,
            name: file.name,
            width: img.width,
            height: img.height
          };
          
          setImages(prev => {
            const updated = [...prev, newImage];
            if (updated.length === 1) setSelectedId(newImage.id);
            return updated;
          });

          // Smart Analysis on first image
          if (images.length === 0) {
            setIsAnalyzing(true);
            const base64 = (event.target?.result as string).split(',')[1];
            try {
              const suggestions = await analyzeScreenshotColors(base64);
              setBgColor(suggestions.backgroundColor);
            } catch (err) {
              console.error(err);
            } finally {
              setIsAnalyzing(false);
            }
          }
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    });
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  useEffect(() => {
    if (images.length === 0) return;

    const updateAllImages = async () => {
      setIsProcessing(true);
      const updatedImages = await Promise.all(images.map(async (imgState) => {
        return new Promise<ImageState>((resolve) => {
          const img = new Image();
          img.onload = async () => {
            const result = await processSingleImage(img, targetDimension, resizeMode, bgColor);
            resolve({ ...imgState, processedUrl: result });
          };
          img.src = imgState.originalUrl;
        });
      }));
      setImages(updatedImages);
      setIsProcessing(false);
    };

    const timeoutId = setTimeout(updateAllImages, 300);
    return () => clearTimeout(timeoutId);
  }, [targetDimension, resizeMode, bgColor, images.length, processSingleImage]);

  const handleDownload = (img: ImageState) => {
    if (!img.processedUrl) return;
    const link = document.createElement('a');
    link.download = `appstore-${targetDimension.width}x${targetDimension.height}-${img.name}`;
    link.href = img.processedUrl;
    link.click();
  };

  const handleDownloadAll = () => {
    images.forEach((img, index) => {
      setTimeout(() => {
        handleDownload(img);
      }, index * 200);
    });
  };

  const removeImage = (id: string) => {
    setImages(prev => {
      const filtered = prev.filter(img => img.id !== id);
      if (selectedId === id) {
        setSelectedId(filtered.length > 0 ? filtered[0].id : null);
      }
      return filtered;
    });
  };

  // Explicitly type groupedPresets to Record<string, Dimension[]> to ensure downstream inference works
  const groupedPresets = useMemo<Record<string, Dimension[]>>(() => {
    return APPLE_PRESETS.reduce((acc, preset) => {
      if (!acc[preset.category]) acc[preset.category] = [];
      acc[preset.category].push(preset);
      return acc;
    }, {} as Record<string, Dimension[]>);
  }, []);

  return (
    <div className="min-h-screen bg-[#fafafa] flex flex-col items-center py-8 px-4">
      <header className="max-w-6xl w-full text-center mb-8">
        <h1 className="text-4xl font-black text-gray-900 mb-2 tracking-tight">AppStore Studio</h1>
        <p className="text-gray-500 max-w-2xl mx-auto font-medium">
          Professional resizing for iPhone, iPad, and Apple Watch screenshots.
        </p>
      </header>

      <main className="max-w-7xl w-full grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: Gallery & Upload */}
        <div className="lg:col-span-3 space-y-4">
          <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100 flex flex-col">
            <div className="flex items-center justify-between mb-4 px-1">
              <h2 className="text-[11px] font-black text-gray-400 uppercase tracking-[0.2em]">Screenshots</h2>
              <span className="bg-blue-100 text-blue-600 text-[10px] font-black px-2 py-0.5 rounded-full">{images.length}</span>
            </div>
            
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept="image/*" 
              multiple
              onChange={handleFileUpload} 
            />

            {images.length === 0 ? (
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-gray-200 rounded-2xl flex flex-col items-center justify-center p-8 cursor-pointer hover:border-blue-400 hover:bg-blue-50/50 transition-all group"
              >
                <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-300 group-hover:text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </div>
                <p className="text-xs text-gray-400 text-center font-bold uppercase tracking-wider">Add Files</p>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar max-h-[50vh]">
                {images.map((img) => (
                  <div 
                    key={img.id}
                    onClick={() => setSelectedId(img.id)}
                    className={`group relative p-2 rounded-2xl cursor-pointer border-2 transition-all flex items-center gap-3 ${
                      selectedId === img.id ? 'border-blue-500 bg-blue-50/50' : 'border-transparent hover:bg-gray-50'
                    }`}
                  >
                    <img src={img.originalUrl} alt={img.name} className="w-10 h-14 object-cover rounded-lg shadow-sm bg-gray-100 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-gray-700 truncate">{img.name}</p>
                      <p className="text-[10px] text-gray-400 font-mono">{img.width}×{img.height}</p>
                    </div>
                    <button 
                      onClick={(e) => { e.stopPropagation(); removeImage(img.id); }}
                      className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-500 p-1.5 transition-opacity"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
            
            {images.length > 0 && (
              <div className="mt-4 space-y-2">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full py-2 bg-gray-50 hover:bg-gray-100 text-gray-500 text-[10px] font-black rounded-xl transition-all uppercase tracking-widest border border-gray-100"
                >
                  Add More
                </button>
                <button
                  onClick={handleDownloadAll}
                  className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white text-xs font-black rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 uppercase tracking-widest active:scale-95"
                >
                  Export All
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Middle: Controls */}
        <div className="lg:col-span-3 space-y-6">
          <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100">
            <h2 className="text-[11px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4">Target Device</h2>
            <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
              {/* Added explicit cast to Object.entries to resolve "Property 'map' does not exist on type 'unknown'" error */}
              {(Object.entries(groupedPresets) as [string, Dimension[]][]).map(([category, presets]) => (
                <div key={category} className="space-y-2">
                  <h3 className="text-[10px] font-black text-blue-500 uppercase tracking-widest flex items-center gap-2">
                    <span className="w-1 h-1 bg-blue-500 rounded-full"></span>
                    {category}
                  </h3>
                  <div className="grid grid-cols-1 gap-2">
                    {presets.map((p) => (
                      <button
                        key={p.label}
                        onClick={() => setTargetDimension(p)}
                        className={`w-full text-left p-3 rounded-2xl border-2 transition-all group ${
                          targetDimension.label === p.label 
                            ? 'border-blue-500 bg-blue-50/50 text-blue-700 font-bold' 
                            : 'border-transparent bg-gray-50/50 hover:bg-gray-100 text-gray-600'
                        }`}
                      >
                        <div className="text-[11px] font-bold tracking-tight mb-0.5 group-hover:translate-x-0.5 transition-transform">{p.label}</div>
                        <div className="text-[10px] font-mono opacity-50">{p.width} × {p.height}px</div>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white p-5 rounded-3xl shadow-sm border border-gray-100">
            <h2 className="text-[11px] font-black text-gray-400 uppercase tracking-[0.2em] mb-4">Adjust Canvas</h2>
            <div className="flex bg-gray-50 p-1.5 rounded-2xl border border-gray-100">
              {(['contain', 'cover', 'stretch'] as ResizeMode[]).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setResizeMode(mode)}
                  className={`flex-1 py-2 text-[10px] font-black rounded-xl capitalize transition-all tracking-wider ${
                    resizeMode === mode ? 'bg-white shadow-md text-blue-600' : 'text-gray-400 hover:text-gray-600'
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>
            
            <div className="mt-6">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-[11px] font-black text-gray-400 uppercase tracking-[0.2em]">Background</h2>
                {isAnalyzing && (
                  <div className="flex items-center gap-1.5">
                    <div className="w-1 h-1 bg-blue-500 rounded-full animate-bounce"></div>
                    <div className="w-1 h-1 bg-blue-500 rounded-full animate-bounce [animation-delay:0.1s]"></div>
                    <div className="w-1 h-1 bg-blue-500 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-3 bg-gray-50 p-2 rounded-2xl border border-gray-100">
                <div className="relative w-10 h-10 shrink-0">
                  <input 
                    type="color" 
                    value={bgColor} 
                    onChange={(e) => setBgColor(e.target.value)}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <div 
                    className="w-full h-full rounded-xl border border-white/20 shadow-inner"
                    style={{ backgroundColor: bgColor }}
                  ></div>
                </div>
                <input 
                  type="text" 
                  value={bgColor} 
                  onChange={(e) => setBgColor(e.target.value)}
                  className="flex-1 bg-transparent text-xs font-mono font-bold text-gray-700 outline-none uppercase"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right: Preview */}
        <div className="lg:col-span-6 h-full min-h-[700px]">
          <div className="bg-white rounded-[2rem] shadow-2xl border border-gray-100 overflow-hidden flex flex-col h-full sticky top-8">
            <div className="p-5 border-b border-gray-50 flex items-center justify-between bg-white/80 backdrop-blur-md">
              <div className="flex items-center gap-4">
                <div className="flex gap-2">
                  <div className="w-3 h-3 rounded-full bg-red-100 border border-red-200"></div>
                  <div className="w-3 h-3 rounded-full bg-amber-100 border border-amber-200"></div>
                  <div className="w-3 h-3 rounded-full bg-emerald-100 border border-emerald-200"></div>
                </div>
                <span className="text-[10px] font-black text-gray-400 tracking-[0.2em] uppercase">
                  {selectedImage ? `Rendering: ${selectedImage.name}` : 'Ready to Process'}
                </span>
              </div>
              {isProcessing && (
                <div className="text-[9px] font-black text-blue-500 animate-pulse tracking-[0.25em]">PROCESSING...</div>
              )}
            </div>

            <div className="flex-1 flex items-center justify-center p-12 bg-[#fcfcfd] relative overflow-hidden group">
              <div className="absolute inset-0 opacity-[0.03]" style={{backgroundImage: 'radial-gradient(#000 2px, transparent 0)', backgroundSize: '32px 32px'}}></div>
              
              {selectedImage?.processedUrl ? (
                <div className="relative max-h-full w-full flex items-center justify-center">
                  <div className="relative animate-in fade-in zoom-in duration-500">
                     <img 
                      src={selectedImage.processedUrl} 
                      alt="Processed Preview" 
                      className="shadow-[0_40px_100px_rgba(0,0,0,0.15)] rounded-lg max-h-[70vh] w-auto transition-transform duration-700 group-hover:scale-[1.01]"
                    />
                    
                    <div className="absolute top-6 right-6 opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-300">
                      <button 
                        onClick={() => handleDownload(selectedImage)}
                        className="bg-white shadow-2xl p-4 rounded-3xl text-gray-800 hover:text-blue-600 hover:scale-110 transition-all active:scale-95 border border-gray-100"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                      </button>
                    </div>

                    <div className="absolute -bottom-10 left-0 right-0 text-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <p className="text-[10px] font-black text-gray-300 tracking-widest uppercase">
                        {targetDimension.width} × {targetDimension.height} Native
                      </p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center max-w-sm">
                  <div className="w-20 h-20 bg-blue-50/50 rounded-[2.5rem] flex items-center justify-center mx-auto mb-8 border border-blue-100">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                  </div>
                  <h3 className="text-gray-900 font-black text-xl mb-3 tracking-tight">Studio Workspace</h3>
                  <p className="text-gray-400 text-sm mb-8 leading-relaxed font-medium">
                    Select a target device and upload your screenshots. We'll handle the precision cropping and formatting.
                  </p>
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="px-8 py-4 bg-gray-900 text-white font-black text-xs rounded-2xl hover:bg-black transition-all shadow-xl active:scale-95 uppercase tracking-[0.2em]"
                  >
                    Start Importing
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      <footer className="mt-16 text-gray-300 text-[10px] font-black tracking-[0.4em] uppercase pb-12">
        AppStore Studio &bull; {new Date().getFullYear()} &bull; Professional Edition
      </footer>
      
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 5px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #f1f1f1;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #e5e7eb;
        }
        @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
        @keyframes zoom-in { from { transform: scale(0.95); opacity: 0; } to { transform: scale(1); opacity: 1; } }
        .animate-in { animation: fade-in 0.5s ease-out, zoom-in 0.5s cubic-bezier(0.2, 0, 0, 1); }
      `}</style>
    </div>
  );
};

export default App;
