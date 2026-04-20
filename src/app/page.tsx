"use client";

import { useState, useRef, useEffect } from "react";
import { useTracking } from "@/hooks/useTracking";
import Webcam from "react-webcam";
import { getS3Url } from "@/lib/s3";

type ViewState = "input" | "processing" | "result";

const bedTypes = [
  {
    id: "1",
    name: "Mango Juice",
    thumbnail: "https://pv22-prod-eng-s3.s3.us-east-1.amazonaws.com/demo/bed_mango_juice_small.png"
  },
  {
    id: "2",
    name: "Honey Comb",
    thumbnail: "https://pv22-prod-eng-s3.s3.us-east-1.amazonaws.com/demo/bed_honey_comb_small.png"
  },
  {
    id: "3",
    name: "Jewellery",
    thumbnail: "https://pv22-prod-eng-s3.s3.us-east-1.amazonaws.com/demo/bed_jewellery_small.png"
  }
];

const PREVIEW_VIDEO_URL = "https://pv22-prod-eng-s3.s3.us-east-1.amazonaws.com/demo/bed-template-5mb.mp4";

export default function Home() {
  const [viewState, setViewState] = useState<ViewState>("input");
  const [selfieFile, setSelfieFile] = useState<File | null>(null);
  const [selfiePreview, setSelfiePreview] = useState<string | null>(null);
  const [fullBodyFile, setFullBodyFile] = useState<File | null>(null);
  const [fullBodyPreview, setFullBodyPreview] = useState<string | null>(null);
  const [selectedBedType, setSelectedBedType] = useState(bedTypes[0]);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [videoProgress, setVideoProgress] = useState(0);
  const [debugMode, setDebugMode] = useState(false);

  // Camera states
  const [selfieCameraMode, setSelfieCameraMode] = useState(false);
  const [fullBodyCameraMode, setFullBodyCameraMode] = useState(false);
  const [cameraPermission, setCameraPermission] = useState<boolean | null>(null);

  // Result visibility — hidden until user successfully triggers generation
  const [resultVisible, setResultVisible] = useState(false);

  const { trackAction, sessionId } = useTracking();
  const selfieInputRef = useRef<HTMLInputElement>(null);
  const fullBodyInputRef = useRef<HTMLInputElement>(null);

  const previewVideoRef = useRef<HTMLVideoElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const selfieWebcamRef = useRef<Webcam>(null);
  const fullBodyWebcamRef = useRef<Webcam>(null);

  // FIX 1: Safe dataLayer push — avoids spreading nested objects (e.g. ecommerce payloads)
  // FIX 2: All event names now use consistent snake_case ("selfie_upload" not "selfi_upload")
  const sendGtagEvent = (eventName: string, params?: Record<string, any>) => {
    if (typeof window === "undefined") return;

    // Standard GA4 gtag call
    if ((window as any).gtag) {
      (window as any).gtag("event", eventName, params);
    }

    // GTM dataLayer push — params kept nested under "eventParams" to avoid
    // corrupting structured payloads (e.g. ecommerce objects)
    if ((window as any).dataLayer) {
      (window as any).dataLayer.push({
        event: eventName,
        event_params: params ?? {},  // FIX 2: snake_case key; nested not spread
      });
    }
  };

  useEffect(() => {
    trackAction("visit");
  }, []);

  // Navigation scroll effect
  useEffect(() => {
    const sections = [
      { id: null, navSection: 'home', threshold: 0 },
      { id: 'creation-studio', navSection: 'create', threshold: 0.3 },
      { id: 'remix-result', navSection: 'result', threshold: 0.3 },
    ];

    function updateActiveNav() {
      const scrollY = window.scrollY + window.innerHeight * 0.5;
      let active = 'home';

      sections.forEach(({ id, navSection }) => {
        if (!id) return;
        const el = document.getElementById(id);
        if (el && el.offsetTop <= scrollY) active = navSection;
      });

      document.querySelectorAll('.nav-item').forEach((el) => {
        const navItem = el as HTMLElement;
        const isActive = navItem.dataset.section === active;

        if (isActive) {
          navItem.classList.add('bg-gradient-to-tr', 'from-[#b60055]', 'to-[#e4006c]', 'text-white');
          navItem.classList.remove('text-[#1b1c1c]');
        } else {
          navItem.classList.remove('bg-gradient-to-tr', 'from-[#b60055]', 'to-[#e4006c]', 'text-white');
          navItem.classList.add('text-[#1b1c1c]');
        }
      });
    }

    window.addEventListener('scroll', updateActiveNav);
    updateActiveNav();

    return () => window.removeEventListener('scroll', updateActiveNav);
  }, []);

  // Add beforeunload listener to prevent accidental navigation during processing
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (viewState === "processing") {
        e.preventDefault();
        e.returnValue = "Your video is still generating. Are you sure you want to leave?";
        return e.returnValue;
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [viewState]);

  const scrollToSection = (id: string) => {
    setTimeout(() => {
      const el = document.getElementById(id);
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'selfie' | 'fullBody') => {
    setError(null);
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 5 * 1024 * 1024) {
        setError("File size exceeds the 5MB limit.");
        return;
      }
      if (!file.type.startsWith("image/")) {
        setError("Please select a valid image file.");
        return;
      }

      if (type === 'selfie') {
        setSelfieFile(file);
        setSelfiePreview(URL.createObjectURL(file));
        trackAction("upload_selfie");
        // FIX 3: Was "selfi_upload" — corrected to "selfie_upload"
        sendGtagEvent("selfie_upload");
      } else {
        setFullBodyFile(file);
        setFullBodyPreview(URL.createObjectURL(file));
        trackAction("upload_full_body");
        sendGtagEvent("fullbody_upload");
      }
    }
  };

  const clearFile = (type: 'selfie' | 'fullBody') => {
    if (type === 'selfie') {
      setSelfieFile(null);
      setSelfiePreview(null);

      if (selfieInputRef.current) selfieInputRef.current.value = "";
    } else {
      setFullBodyFile(null);
      setFullBodyPreview(null);
      if (fullBodyInputRef.current) fullBodyInputRef.current.value = "";
    }
  };

  const handleGenerate = async () => {
    if (!selfieFile || !fullBodyFile || !selectedBedType) return;

    setError(null);
    setResultVisible(true);
    setViewState("processing");
    setProgress(0);

    // Scroll to result section immediately (processing indicator lives inside it)
    scrollToSection('remix-result');
    sendGtagEvent("generate_video");

    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 98) return 98; // Hold at 98% until API returns
        // 5-7 minutes = 300-420 seconds. 
        // We'll increment by ~0.25% every second to reach ~90% in 6 minutes.
        return prev + 0.25;
      });
    }, 1000);

    try {
      // 1. Call the Scrolo API directly from the browser for maximum visibility and long-wait handling
      const backendUrl = debugMode
        ? 'https://fastapi.pinkvilla.com/v1/scrolo/failure'
        : 'https://fastapi.pinkvilla.com/v1/scrolo/success';

      console.log(`[Client] Initiating generation at: ${backendUrl}`);

      const response = await fetch(backendUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
        mode: 'cors'
      });

      const data = await response.json();
      console.log(`[Client] Scrolo API Response:`, data);

      if (!response.ok || data.status !== 'success') {
        throw new Error(data.message || 'We encountered an issue processing your request. Please try again.');
      }

      // 2. Generation successful! Now retrieve the presigned video playback link from our local API
      const videoResponse = await fetch('/api/generate');
      const videoData = await videoResponse.json();

      if (!videoResponse.ok || !videoData.success) {
        throw new Error('Video generated successfully, but we encountered an issue retrieving the playback link.');
      }

      clearInterval(progressInterval);
      setProgress(100);
      setVideoUrl(videoData.videoUrl);
      setViewState("result");
      setIsPlaying(true);
      scrollToSection('remix-result');
      trackAction("videoGenerate");
    } catch (err: any) {
      clearInterval(progressInterval);

      // Specifically handle the case where the API returns success: false with a message
      const errorMessage = err.message || 'We encountered an unexpected error. Please check your connection and try again.';
      setError(errorMessage);

      setViewState("input");
      setResultVisible(false);

      // Removed window.scrollTo as requested. The error is now displayed below the generate button.
    }
  };

  const handleDownload = () => {
    trackAction("download");
    sendGtagEvent("video_download");
    if (videoUrl) {
      const a = document.createElement("a");
      a.href = videoUrl;
      a.download = "pinkvilla-remix-video.mp4";
      a.target = "_blank"; // Prevent navigating away from the app
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };

  const handleShare = async () => {
    trackAction("share");
    sendGtagEvent("video_share");
    if (navigator.share && videoUrl) {
      try {
        await navigator.share({
          title: "Pinkvilla Remix Video",
          text: "Check out my remix video created with Pinkvilla!",
          url: videoUrl,
        });
      } catch (err) {
        console.error("Error sharing:", err);
      }
    } else {
      navigator.clipboard.writeText(videoUrl || "");
      alert("Link copied to clipboard!");
    }
  };

  const togglePlayPause = () => {
    const video = videoRef.current;
    if (video) {
      if (isPlaying) {
        video.pause();
        setIsPlaying(false);
      } else {
        video.play();
        setIsPlaying(true);
      }
    }
  };

  const togglePreviewPlayPause = () => {
    const video = previewVideoRef.current;
    if (video) {
      video.paused ? video.play() : video.pause();
    }
    sendGtagEvent("template_video_play_pause");
  };

  const resetAll = () => {
    setViewState("input");
    clearFile('selfie');
    clearFile('fullBody');
    setVideoUrl(null);
    setProgress(0);
    setVideoProgress(0);
    setIsPlaying(false);
    setResultVisible(false);
  };

  // Camera functions
  const capturePhoto = (type: 'selfie' | 'fullBody') => {
    const webcamRef = type === 'selfie' ? selfieWebcamRef : fullBodyWebcamRef;
    const imageSrc = webcamRef.current?.getScreenshot();

    if (imageSrc) {
      fetch(imageSrc)
        .then(res => res.blob())
        .then(blob => {
          const file = new File([blob], `${type}-capture.jpg`, { type: 'image/jpeg' });
          if (type === 'selfie') {
            setSelfieFile(file);
            setSelfiePreview(imageSrc);
            setSelfieCameraMode(false);
            trackAction("upload_selfie");
            // FIX 3: Was "selfi_upload" — corrected to "selfie_upload"
            sendGtagEvent("selfie_upload");
          } else {
            setFullBodyFile(file);
            setFullBodyPreview(imageSrc);
            setFullBodyCameraMode(false);
            trackAction("upload_full_body");
            sendGtagEvent("fullbody_upload");
          }
        });
    }
  };

  const toggleCameraMode = async (type: 'selfie' | 'fullBody') => {
    if (cameraPermission === null) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        stream.getTracks().forEach(track => track.stop());
        setCameraPermission(true);
      } catch (err) {
        setCameraPermission(false);
        setError("Camera access denied. Please use file upload instead.");
        return;
      }
    }

    if (type === 'selfie') {
      const mode = !selfieCameraMode;
      setSelfieCameraMode(mode);
      setFullBodyCameraMode(false);
      // FIX 3: Was "selfi_camera" — corrected to "selfie_camera"
      if (mode) sendGtagEvent("selfie_camera");
    } else {
      const mode = !fullBodyCameraMode;
      setFullBodyCameraMode(mode);
      setSelfieCameraMode(false);
      if (mode) sendGtagEvent("fullbody_camera");
    }
  };

  return (
    <div className="bg-surface text-on-surface font-body antialiased overflow-x-hidden">
      {/* TOP NAV */}
      <nav className="fixed top-0 w-full z-50 bg-[#faf9f9]/80 backdrop-blur-xl flex flex-col items-center justify-center px-6 py-4 text-center">
        <h1 className="font-headline text-2xl font-black text-[#b60055] tracking-tighter uppercase">
          PINKVILLA
        </h1>
        <h2 className="text-sm text-gray-600">
          Transform your images into Viral Videos
        </h2>
      </nav>

      {/* MAIN CONTENT */}
      <main className="pt-24 pb-32 max-w-lg mx-auto">
        {/* HERO SECTION */}
        <section className="px-4 flex flex-col items-center mb-10">
          <div className="w-full max-w-md mx-auto relative group">
            <div className="aspect-[9/16] w-full rounded-xl overflow-hidden bg-surface-container-low shadow-2xl relative">
              <div className="video-container relative w-full h-full">
                <video
                  ref={previewVideoRef}
                  autoPlay
                  muted
                  loop
                  playsInline
                  controls
                  className="w-full h-full object-cover"
                  style={{ minHeight: '100%' }}
                >
                  <source src={PREVIEW_VIDEO_URL} type="video/mp4" />
                  Your browser does not support the video tag.
                </video>

                {/* Play/Pause toggle — bottom-left */}
                <button
                  id="template_video_play_pause"
                  onClick={togglePreviewPlayPause}
                  className="absolute bottom-4 left-4 bg-black/60 text-white border-none p-3 rounded-full cursor-pointer text-lg z-10 pointer-events-auto gtm-event-template_video_play_pause"
                >
                  &#9654;
                </button>

                {/* Remix Now CTA — top-center */}
                <div className="absolute top-6 left-0 right-0 flex justify-center z-20">
                  <button
                    id="create_video"
                    onClick={() => { scrollToSection('creation-studio'); sendGtagEvent("create_video"); }}
                    className="px-8 py-3 rounded-full font-bold text-white text-sm tracking-wide shadow-xl gtm-event-create_video"
                    style={{ background: 'linear-gradient(135deg, #b60055, #e4006c)' }}
                  >
                    Remix Now
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* DIVIDER */}
        <div className="section-divider px-4 mt-12">
          <span className="font-label text-[0.6rem] font-black uppercase tracking-[0.2em] text-primary whitespace-nowrap">Creation your Remix</span>
        </div>

        {/* CREATION STUDIO */}
        <section className="px-6 scroll-mt-24" id="creation-studio">
          <div className="space-y-10">
            {/* Step 1: Selfie */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-headline text-lg font-bold">1. Upload Selfie</h3>
                <span className="text-[10px] bg-primary/10 text-primary px-2 py-1 rounded-full font-bold uppercase tracking-wider">Required</span>
              </div>
              <div className="relative group cursor-pointer overflow-hidden rounded-xl bg-surface-container-low aspect-square flex flex-col items-center justify-center border-2 border-dashed border-outline-variant/30 hover:border-primary/50 transition-colors" onClick={() => { if (!selfieCameraMode) selfieInputRef.current?.click(); }}>
                {/* Toggle — always visible */}
                <div className="absolute top-4 inset-x-0 z-30 flex justify-center" onClick={(e) => e.stopPropagation()}>
                  <div className="flex bg-white/80 backdrop-blur-md p-1 rounded-full shadow-sm border border-outline-variant/20">
                    <button
                      id="selfi_upload"
                      onClick={() => { setSelfieCameraMode(false); selfieInputRef.current?.click(); }}
                      // FIX 3: CSS class updated from gtm-event-selfi_upload to gtm-event-selfie_upload
                      className={`px-6 py-1.5 rounded-full text-xs font-bold transition-all gtm-event-selfie_upload ${!selfieCameraMode ? 'bg-primary text-[#b60055] shadow-sm' : 'text-black'}`}
                      type="button"
                    >Upload</button>
                    <button
                      onClick={() => toggleCameraMode('selfie')}
                      // FIX 3: CSS class updated from gtm-event-selfi_camera to gtm-event-selfie_camera
                      className={`px-6 py-1.5 rounded-full text-xs font-bold transition-all gtm-event-selfie_camera ${selfieCameraMode ? 'bg-primary text-[#b60055] shadow-sm' : 'text-black'}`}
                      type="button"
                    >Camera</button>
                  </div>
                </div>

                {selfieCameraMode ? (
                  <div className="absolute inset-0 w-full h-full">
                    <Webcam
                      ref={selfieWebcamRef}
                      screenshotFormat="image/jpeg"
                      className="w-full h-full object-cover"
                      videoConstraints={{ width: { ideal: 1280 }, height: { ideal: 960 }, facingMode: "user" }}
                    />
                    <div className="absolute bottom-4 inset-x-0 z-20 flex justify-center gap-2" onClick={(e) => e.stopPropagation()}>
                      <button onClick={() => capturePhoto('selfie')} className="px-6 py-3 rounded-full bg-primary text-white font-bold text-sm shadow-lg hover:scale-105 transition-transform" type="button">
                        <span className="material-symbols-outlined">camera</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <img className="absolute inset-0 w-full h-full object-cover opacity-20 group-hover:opacity-30 transition-opacity" src="https://lh3.googleusercontent.com/aida-public/AB6AXuASSArI542y9TNuwyWq3MDggjuuLB2IHCbZ56etmYUzWvuaxZGqJvM5Hu9A_368BYObGjndN8zNDZ8jFRB1ATyJsREqANCOtGxGUrMgOHhfnR9b74DRiBwZzEClmg3Muaea2JZ278EUlGSfWQ6GR7FOeoIPsGrWPVA1nODoQ9NBPQeV_jgW15zuHP647VvvjNNr7ZVUewQlY0ZlK1ESA9xwrZWlc-bUEph21vVcJYbG8H25OA3Mm-YX5Q17CdQKfS9LMhH6Yhc6o-TV" alt="Portrait upload background" />
                    {selfiePreview ? (
                      <>
                        <img src={selfiePreview} alt="Selfie preview" className="absolute inset-0 w-full h-full object-cover" />
                        <button onClick={(e) => { e.stopPropagation(); clearFile('selfie'); }} className="absolute top-2 right-2 p-2 bg-white/80 hover:bg-white rounded-full text-gray-700 backdrop-blur transition-all">
                          <span className="material-symbols-outlined text-sm">close</span>
                        </button>
                      </>
                    ) : (
                      <div className="relative z-10 flex flex-col items-center text-center p-6">
                        <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-xl mb-4 group-hover:scale-110 duration-200 transition-transform">
                          <span className="material-symbols-outlined text-primary text-3xl">add_a_photo</span>
                        </div>
                        <p className="font-semibold text-on-surface-variant">Upload Selfie</p>
                        <p className="text-xs text-secondary mt-1">High-res, clear facial features</p>
                      </div>
                    )}
                  </>
                )}
                <input ref={selfieInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleFileChange(e, 'selfie')} />
              </div>
            </div>

            {/* Step 2: Full Body */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-headline text-lg font-bold">2. Upload Full Body Photo</h3>
                <span className="text-[10px] bg-primary/10 text-primary px-2 py-1 rounded-full font-bold uppercase tracking-wider">Required</span>
              </div>
              <div className="relative group cursor-pointer overflow-hidden rounded-xl bg-surface-container-low aspect-[3/4] flex flex-col items-center justify-center border-2 border-dashed border-outline-variant/30 hover:border-primary/50 transition-colors" onClick={() => { if (!fullBodyCameraMode) fullBodyInputRef.current?.click(); }}>
                {/* Toggle — always visible */}
                <div className="absolute top-4 inset-x-0 z-30 flex justify-center" onClick={(e) => e.stopPropagation()}>
                  <div className="flex bg-white/80 backdrop-blur-md p-1 rounded-full shadow-sm border border-outline-variant/20">
                    <button
                      id="fullbody_upload"
                      onClick={() => { setFullBodyCameraMode(false); fullBodyInputRef.current?.click(); }}
                      className={`px-6 py-1.5 rounded-full text-xs font-bold transition-all gtm-event-fullbody_upload ${!fullBodyCameraMode ? 'bg-primary text-[#b60055] shadow-sm' : 'text-black'}`}
                      type="button"
                    >Upload</button>
                    <button
                      id="fullbody_camera"
                      onClick={() => toggleCameraMode('fullBody')}
                      className={`px-6 py-1.5 rounded-full text-xs font-bold transition-all gtm-event-fullbody_camera ${fullBodyCameraMode ? 'bg-primary text-[#b60055] shadow-sm' : 'text-black'}`}
                      type="button"
                    >Camera</button>
                  </div>
                </div>

                {fullBodyCameraMode ? (
                  <div className="absolute inset-0 w-full h-full">
                    <Webcam
                      ref={fullBodyWebcamRef}
                      screenshotFormat="image/jpeg"
                      className="w-full h-full object-cover"
                      videoConstraints={{ width: { ideal: 1280 }, height: { ideal: 960 }, facingMode: "user" }}
                    />
                    <div className="absolute bottom-4 inset-x-0 z-20 flex justify-center gap-2" onClick={(e) => e.stopPropagation()}>
                      <button onClick={() => capturePhoto('fullBody')} className="px-6 py-3 rounded-full bg-primary text-white font-bold text-sm shadow-lg hover:scale-105 transition-transform" type="button">
                        <span className="material-symbols-outlined">camera</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <img className="absolute inset-0 w-full h-full object-cover opacity-20 group-hover:opacity-30 transition-opacity" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBboWPPiJcYl6y5uAuqudk-U47I5bqaxEiF5o03YfW1Iprb3yB5AfVNFlmL_7WoMC3Q05MCdfXI0fhnPyRLbmokhpvgLTdL2SaxhJ1vFF2mOemiXaKo6Q_gLs5_57gSjYTDWOeN-n2v4IB4UrClDDy_JvLJLCMMx_K090ZtptqxofgG56LhsMTYePjk90Ep5R-AQL9YpN13mnfqTf30jTadxAA41F0d_57TdhRpOfbxqsizrpl3YmBB8qF3pyMg_MG31S_METTvOqKL" alt="Full body stance upload background" />
                    {fullBodyPreview ? (
                      <>
                        <img src={fullBodyPreview} alt="Full body preview" className="absolute inset-0 w-full h-full object-cover" />
                        <button onClick={(e) => { e.stopPropagation(); clearFile('fullBody'); }} className="absolute top-2 right-2 p-2 bg-white/80 hover:bg-white rounded-full text-gray-700 backdrop-blur transition-all">
                          <span className="material-symbols-outlined text-sm">close</span>
                        </button>
                      </>
                    ) : (
                      <div className="relative z-10 flex flex-col items-center text-center p-6">
                        <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-xl mb-4 group-hover:scale-110 duration-200 transition-transform">
                          <span className="material-symbols-outlined text-primary text-3xl">accessibility_new</span>
                        </div>
                        <p className="font-semibold text-on-surface-variant">Full Body Shot</p>
                        <p className="text-xs text-secondary mt-1">Showcase your full outfit and pose</p>
                      </div>
                    )}
                  </>
                )}
                <input ref={fullBodyInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleFileChange(e, 'fullBody')} />
              </div>
            </div>

            {/* Step 3: Bed Type */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-headline text-lg font-bold">3. Select Bed Type</h3>
                <span className="text-[10px] bg-secondary/10 text-secondary px-2 py-1 rounded-full font-bold uppercase tracking-wider">Selection</span>
              </div>
              <div className="space-y-4">
                {bedTypes.map((bedType) => {
                  const isSelected = selectedBedType.id === bedType.id;
                  return (
                    <label
                      key={bedType.id}
                      id="bed_type_selected"
                      className={`flex items-center p-4 rounded-xl shadow-sm cursor-pointer hover:bg-surface-container transition-all ring-1 gtm-event-bed_type_selected ${isSelected ? 'ring-primary bg-primary/5' : 'ring-outline-variant/20 bg-surface-container-lowest'
                        }`}
                    >
                      <div className="w-24 h-24 rounded-lg overflow-hidden flex-shrink-0">
                        <img className="w-full h-full object-cover" src={bedType.thumbnail.replace('s3://', 'https://s3.amazonaws.com/')} alt={bedType.name} />
                      </div>
                      <p className="ml-4 flex-grow font-bold font-headline text-on-surface">{bedType.name}</p>
                      <input
                        type="radio"
                        name="video_base"
                        value={bedType.id}
                        checked={isSelected}
                        onChange={() => {
                          setSelectedBedType(bedType);
                          trackAction("select_bed", { bedType: bedType.name });
                          // FIX 4: Renamed from "bed_type" to "bed_type_selected"; param key now snake_case
                          sendGtagEvent("bed_type_selected", { bed_type_name: bedType.name });
                        }}
                        className="accent-primary w-5 h-5 flex-shrink-0 cursor-pointer"
                      />
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Generate CTA */}
            <div className="pt-2 pb-4">
              <button
                id="generate_video"
                onClick={handleGenerate}
                disabled={!selfieFile || !fullBodyFile}
                className="w-full py-5 rounded-xl editorial-gradient text-white font-bold text-lg shadow-lg shadow-primary/20 hover:opacity-90 active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed gtm-event-generate_video"
              >
                <span>Generate your Remix Video</span>
                <span className="material-symbols-outlined">auto_awesome</span>
              </button>
              {/* Error Display - Now located here for immediate visibility */}
              {error && (
                <div className="mt-6 animate-in fade-in slide-in-from-top-4 duration-500">
                  <div className="rounded-2xl bg-red-50 p-6 border border-red-200 shadow-sm relative">
                    <button
                      onClick={() => setError(null)}
                      className="absolute top-4 right-4 text-red-400 hover:text-red-600 transition-colors"
                    >
                      <span className="material-symbols-outlined text-sm">close</span>
                    </button>
                    <div className="flex items-start gap-3 text-left">
                      <span className="material-symbols-outlined text-red-500 mt-0.5">error</span>
                      <div className="space-y-1">
                        <p className="text-sm font-bold text-red-800">Generation Failed</p>
                        <p className="text-sm font-medium text-red-700 leading-relaxed">{error}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Debug Toggle */}
              <div className="mt-8 flex items-center justify-center gap-2">
                <button
                  onClick={() => setDebugMode(!debugMode)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all text-[10px] font-bold uppercase tracking-wider ${debugMode
                    ? 'bg-red-50 border-red-200 text-red-600'
                    : 'bg-gray-50 border-gray-200 text-gray-400 hover:text-gray-600'
                    }`}
                >
                  <span className="material-symbols-outlined text-xs">bug_report</span>
                  {debugMode ? 'Test Failure Mode: ON' : 'Normal Mode'}
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Removed redundant Error Display from bottom */}

        {/* RESULT SECTION — only rendered after Generate is clicked */}
        {resultVisible && (
          <>
            {/* DIVIDER */}
            <div className="section-divider px-4 mt-12">
              <span className="font-label text-[0.6rem] font-black uppercase tracking-[0.2em] text-primary whitespace-nowrap">Remix Ready</span>
            </div>

            {/* REMIX RESULT */}
            <section className="px-4 flex flex-col items-center scroll-mt-24" id="remix-result">
              <div className="w-full mb-6 text-center">
                <span className="font-label text-[0.65rem] uppercase tracking-[0.1em] font-bold text-primary mb-2 block">GENERATED BY PINKVILLA</span>
                <h2 className="font-headline text-3xl font-extrabold tracking-tight text-on-surface">Your Remix Video</h2>
                <p className="text-on-surface-variant text-sm mt-1">
                  {viewState === "processing" ? "Generating your video..." : videoUrl ? "Ready to share with the world" : "Upload your photos above to get started"}
                </p>
              </div>

              {/* Processing indicator */}
              {viewState === "processing" && (
                <div className="w-full mb-6" id="processing-section">
                  <div className="rounded-2xl bg-white p-6 shadow-xl shadow-primary/5 border border-primary/5">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-bold">Active Task</h3>
                      <span className="text-xs font-mono bg-primary/10 text-primary px-2 py-1 rounded">ID: #PV-88291</span>
                    </div>
                    <div className="space-y-4">
                      {/* Tab preservation warning */}
                      <div className="flex items-center gap-3 bg-blue-50/50 p-3 rounded-xl border border-blue-100 mb-2 animate-pulse">
                        <span className="material-symbols-outlined text-blue-500 text-sm">info</span>
                        <p className="text-[11px] font-medium text-blue-700">Please keep this tab open. Navigating away or closing the tab will cancel the generation.</p>
                      </div>

                      <div className="flex justify-between text-sm">
                        <span className="font-medium">AI is crafting your video...</span>
                        <span className="font-bold text-primary">{Math.round(progress)}%</span>
                      </div>
                      <div className="h-2.5 w-full overflow-hidden rounded-full bg-primary/10">
                        <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${progress}%` }}></div>
                      </div>
                      <p className="text-xs text-gray-500 italic">This typically takes 5-7 minutes. Perfection takes time!</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Video Player */}
              <div className="relative w-full max-w-[320px] mx-auto aspect-[9/16] rounded-xl overflow-hidden shadow-2xl bg-surface-container-highest group">
                {videoUrl ? (
                  <video
                    ref={videoRef}
                    src={videoUrl}
                    autoPlay
                    loop
                    playsInline
                    className="w-full h-full object-cover"
                    onTimeUpdate={(e) => {
                      const video = e.currentTarget;
                      if (video.duration) {
                        setVideoProgress((video.currentTime / video.duration) * 100);
                      }
                    }}
                    onPlay={() => setIsPlaying(true)}
                    onPause={() => setIsPlaying(false)}
                    onError={(e) => {
                      console.error("Video loading error:", e);
                      setError("Failed to load the generated video. This may be due to an expired link or temporary S3 connectivity issue.");
                      setViewState("input");
                      setResultVisible(false);
                    }}
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-surface-container-low">
                    {viewState === "processing" ? (
                      <div className="flex flex-col items-center gap-4 p-8 text-center">
                        <div className="w-16 h-16 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
                        <p className="text-sm font-medium text-on-surface-variant">Generating your video...</p>
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-3 p-8 text-center">
                        <span className="material-symbols-outlined text-5xl text-outline-variant">video_file</span>
                        <p className="text-sm text-on-surface-variant">Your generated video will appear here</p>
                      </div>
                    )}
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-on-surface/60 to-transparent opacity-80 pointer-events-none"></div>

                {videoUrl && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <button
                      id="generate_video_play_pause"
                      onClick={() => { togglePlayPause(); sendGtagEvent("generate_video_play_pause"); }}
                      className="w-16 h-16 rounded-full bg-white/20 glass-panel border border-white/30 flex items-center justify-center text-white scale-100 hover:scale-110 duration-200 gtm-event-generate_video_play_pause"
                    >
                      <span className="material-symbols-outlined text-4xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                        {isPlaying ? "pause" : "play_arrow"}
                      </span>
                    </button>
                  </div>
                )}

                <div className="absolute bottom-4 left-4 right-4 h-1 bg-white/30 rounded-full overflow-hidden">
                  <div className="h-full bg-primary transition-all duration-300" style={{ width: `${videoProgress}%` }}></div>
                </div>

                <div className="absolute top-4 right-4 bg-white/10 glass-panel px-3 py-1 rounded-full border border-white/20">
                  <span className="font-label text-[0.6rem] font-bold text-white uppercase tracking-wider">HD 1080p</span>
                </div>
              </div>

              {/* Action Buttons */}
              {videoUrl && (
                <div className="w-full mt-8 space-y-4">
                  <button id="video_share" onClick={handleShare} className="w-full editorial-gradient py-5 rounded-full text-white font-headline font-bold text-lg flex items-center justify-center gap-3 shadow-lg shadow-primary/20 hover:opacity-90 transition-all active:scale-95 duration-200 gtm-event-video_share">
                    <span className="material-symbols-outlined">share</span>
                    Share Remix
                  </button>
                  <button id="video_download" onClick={handleDownload} className="w-full bg-transparent border-2 border-outline-variant/30 py-5 rounded-full text-primary font-headline font-bold text-lg flex items-center justify-center gap-3 hover:bg-primary/5 transition-all active:scale-95 duration-200 gtm-event-video_download">
                    <span className="material-symbols-outlined">download</span>
                    Download Remix
                  </button>
                  <button onClick={resetAll} className="w-full bg-transparent border-2 border-outline-variant/30 py-5 rounded-full text-secondary font-headline font-bold text-lg flex items-center justify-center gap-3 hover:bg-surface-container transition-all active:scale-95 duration-200">
                    <span className="material-symbols-outlined">refresh</span>
                    Start Over
                  </button>
                </div>
              )}
            </section>
          </>
        )}

      </main>

      {/* BOTTOM NAV */}
      <nav className="fixed bottom-0 left-0 w-full flex justify-around items-center px-8 pb-6 pt-3 bg-[#faf9f9]/80 backdrop-blur-xl z-50 rounded-t-3xl shadow-[0_-8px_32px_rgba(27,28,28,0.06)]" id="bottom-nav">
        <a href="#" id="home_icon" className="nav-item flex flex-col items-center justify-center p-3 rounded-full scale-90 duration-300 transition-all text-[#1b1c1c] gtm-event-home_icon" data-section="home" onClick={() => sendGtagEvent("home_icon")}>
          <span className="material-symbols-outlined">home</span>
        </a>
        <a href="#creation-studio" id="add_icon" className="nav-item flex flex-col items-center justify-center p-3 rounded-full scale-90 duration-300 transition-all text-[#1b1c1c] gtm-event-add_icon" data-section="create" onClick={() => sendGtagEvent("add_icon")}>
          <span className="material-symbols-outlined">add_circle</span>
        </a>
        <a href="#remix-result" id="user_icon" className="nav-item flex flex-col items-center justify-center p-3 rounded-full scale-90 duration-300 transition-all text-[#1b1c1c] gtm-event-user_icon" data-section="result" onClick={() => sendGtagEvent("user_icon")}>
          <span className="material-symbols-outlined">person</span>
        </a>
      </nav>
    </div>
  );
}