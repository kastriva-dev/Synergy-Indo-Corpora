"use client";

import { useEffect, useState } from "react";
import type { SyntheticEvent } from "react";

type ApplicantGender = "man" | "woman";

export default function WalkingApplicant() {
  const [gender, setGender] = useState<ApplicantGender>("woman");
  const [reducedMotion, setReducedMotion] = useState(false);
  const [videoFailed, setVideoFailed] = useState(false);
  const [videoReady, setVideoReady] = useState(false);

  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updatePreference = () => setReducedMotion(preference.matches);
    updatePreference();
    preference.addEventListener("change", updatePreference);
    return () => preference.removeEventListener("change", updatePreference);
  }, []);

  function alternateCharacter() {
    setVideoReady(false);
    setGender((current) => (current === "man" ? "woman" : "man"));
  }

  function verifyVideoTransparency(event: SyntheticEvent<HTMLVideoElement>) {
    const video = event.currentTarget;
    try {
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const context = canvas.getContext("2d", { willReadFrequently: true });
      if (!context || !canvas.width || !canvas.height) throw new Error("Video frame unavailable");
      context.drawImage(video, 0, 0);
      // The top-left source pixel is part of the keyed green background.
      // Browsers that ignore WebM alpha leave it opaque, so use the SVG fallback.
      if (context.getImageData(0, 0, 1, 1).data[3] > 8) {
        setVideoFailed(true);
        return;
      }
      setVideoReady(true);
    } catch {
      setVideoFailed(true);
    }
  }

  const showFallback = reducedMotion || videoFailed || !videoReady;

  return (
    <div className={`walking-applicant-stage walking-applicant-stage--video${showFallback ? " is-fallback" : ""}`} aria-hidden="true">
      {!reducedMotion && !videoFailed && (
        <video
          key={gender}
          className="walking-applicant-video"
          src={gender === "woman" ? "/media/applicants/applicant-female.webm" : "/media/applicants/applicant-male.webm"}
          autoPlay
          muted
          playsInline
          preload="auto"
          tabIndex={-1}
          onLoadedData={verifyVideoTransparency}
          onEnded={alternateCharacter}
          onError={() => setVideoFailed(true)}
        />
      )}
      {showFallback && (
        <>
          <div className="walking-applicant-stage__eyebrow">
            <span className="walking-applicant-stage__pulse" />
            <span>LANGKAH MENUJU PELUANG</span>
            <span className="walking-applicant-stage__rule" />
          </div>
          <div className="walking-applicant-stage__path" />
          <div className="walking-applicant-track">
            <div className={`walking-applicant ${gender === "woman" ? "is-woman" : "is-man"}`}>
        <svg
          className={`walking-applicant__figure walking-applicant__figure--${gender}`}
          viewBox="0 0 160 220"
          width="160"
          height="220"
          xmlns="http://www.w3.org/2000/svg"
          focusable="false"
        >
          <defs>
            <linearGradient id="applicant-skin" x1="0%" y1="0%" x2="100%" y2="80%">
              <stop offset="0%" stopColor="#f5d4b5" />
              <stop offset="48%" stopColor="#d9a27c" />
              <stop offset="100%" stopColor="#a96d4e" />
            </linearGradient>
            <linearGradient id="applicant-jacket" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="var(--applicant-jacket-light, #31596b)" />
              <stop offset="52%" stopColor="var(--applicant-jacket-mid, #163c4d)" />
              <stop offset="100%" stopColor="var(--applicant-jacket-dark, #0b2636)" />
            </linearGradient>
            <linearGradient id="applicant-shirt" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="var(--applicant-shirt-light, #fff9eb)" />
              <stop offset="100%" stopColor="var(--applicant-shirt-dark, #d8e1dc)" />
            </linearGradient>
            <linearGradient id="applicant-trousers" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="var(--applicant-pants-light, #284655)" />
              <stop offset="100%" stopColor="var(--applicant-pants-dark, #0c2635)" />
            </linearGradient>
            <linearGradient id="applicant-folder" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#d9f36a" />
              <stop offset="55%" stopColor="#b5d94b" />
              <stop offset="100%" stopColor="#7d9c2d" />
            </linearGradient>
            <linearGradient id="applicant-shoe" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#32424a" />
              <stop offset="100%" stopColor="#101e26" />
            </linearGradient>
          </defs>

          <ellipse cx="87" cy="207" rx="34" ry="6" fill="#173329" opacity=".16" />

          <g className="walking-applicant__leg walking-applicant__leg--back">
            <path d="M77 120 C75 137 73 151 77 169 L70 191 C69 195 72 198 78 198 L91 195 L97 174 C100 155 99 136 99 122 Z" fill="url(#applicant-trousers)" />
            <path d="M70 189 C76 191 84 191 91 188 L88 198 L75 201 C69 201 66 197 70 189 Z" fill="url(#applicant-shoe)" />
            <path d="M72 194 L87 193" stroke="#73848b" strokeWidth="1.4" strokeLinecap="round" opacity=".55" />
          </g>

          <g className="walking-applicant__leg walking-applicant__leg--front">
            <path d="M91 121 C95 139 97 154 94 173 L101 191 C103 196 108 197 115 195 L120 191 L110 182 L109 163 C112 146 111 133 108 122 Z" fill="url(#applicant-trousers)" />
            <path d="M101 189 C107 191 114 189 120 187 L126 195 C127 198 123 201 116 201 L103 199 C99 197 98 193 101 189 Z" fill="url(#applicant-shoe)" />
            <path d="M104 194 L121 193" stroke="#73848b" strokeWidth="1.4" strokeLinecap="round" opacity=".55" />
          </g>

          <path d="M84 59 L101 60 L101 76 L84 75 Z" fill="url(#applicant-skin)" />

          <g className="walking-applicant__arm walking-applicant__arm--swing">
            <path d="M75 78 C68 81 65 91 66 102 L70 117 C71 121 76 122 79 118 L78 103 L84 88 Z" fill="url(#applicant-jacket)" />
            <path d="M70 113 L79 113 L82 121 C82 125 77 127 74 123 Z" fill="url(#applicant-skin)" />
          </g>

          <path className="walking-applicant__jacket" d="M78 69 C72 72 69 79 68 90 L65 119 C78 129 99 130 116 120 L112 88 C111 78 105 72 98 69 L90 77 Z" fill="url(#applicant-jacket)" />
          <path d="M84 69 L91 77 L98 69 L105 76 L100 104 L81 104 L77 77 Z" fill="url(#applicant-shirt)" />
          <path d="M84 70 L91 77 L87 91 L79 79 Z" fill="var(--applicant-jacket-light, #31596b)" opacity=".9" />
          <path d="M98 70 L91 77 L96 91 L104 78 Z" fill="var(--applicant-jacket-dark, #0b2636)" opacity=".95" />
          <path d="M91 77 L93 105" stroke="#b7c9c1" strokeWidth="1" opacity=".65" />
          <circle cx="94" cy="112" r="1.4" fill="#d8e5de" opacity=".8" />
          <circle cx="95" cy="119" r="1.4" fill="#d8e5de" opacity=".8" />
          <path d="M68 91 L76 94 L73 115 L66 115 Z" fill="#ffffff" opacity=".06" />

          <g className="walking-applicant__arm walking-applicant__arm--folder">
            <path d="M105 82 C111 85 115 95 119 105 L126 119 L119 124 L108 108 L100 92 Z" fill="url(#applicant-jacket)" />
            <path d="M120 115 L128 117 L132 125 L125 130 L119 123 Z" fill="url(#applicant-skin)" />
            <g className="walking-applicant__portfolio">
              <path d="M112 121 L139 121 L145 151 L118 154 Z" fill="url(#applicant-folder)" />
              <path d="M112 121 L139 121 L139 126 L113 127 Z" fill="#f1ffc0" opacity=".72" />
              <path d="M118 128 L138 127 L141 146 L121 148 Z" fill="#f8f7e8" />
              <path d="M121 133 L136 132 M122 137 L137 136 M123 141 L134 140" stroke="#9baaa2" strokeWidth="1.2" strokeLinecap="round" />
              <path d="M139 121 L145 151 L140 152 L134 122 Z" fill="#78972e" opacity=".6" />
              <path d="M121 121 L124 117 L135 117 L139 121" fill="none" stroke="#b9d85a" strokeWidth="2" strokeLinecap="round" />
            </g>
          </g>

          <g className="walking-applicant__head">
            {gender === "woman" && (
              <path className="walking-applicant__hair walking-applicant__hair--back" d="M77 42 C70 24 81 12 97 13 C113 13 121 28 115 47 L112 61 L103 67 L100 44 L84 39 L83 59 L76 58 Z" fill="#332726" />
            )}
            <path d="M78 31 C80 18 91 14 103 19 C113 23 116 34 112 46 L105 56 L94 59 L83 51 L78 42 Z" fill="url(#applicant-skin)" />
            <path d="M108 36 L118 40 L110 45 Z" fill="#c88f6b" />
            <ellipse cx="80" cy="40" rx="3.5" ry="5" fill="#c88f6b" />
            <ellipse cx="81" cy="40" rx="1.4" ry="2.5" fill="#a56c50" />
            {gender === "woman" ? (
              <path className="walking-applicant__hair" d="M77 39 C71 26 78 15 91 13 C104 10 115 21 115 31 L111 35 L105 26 L93 22 L82 29 L82 41 L78 48 Z" fill="#332726" />
            ) : (
              <path className="walking-applicant__hair" d="M77 37 C72 24 81 15 93 15 C104 15 112 21 113 31 L108 30 L102 25 L91 25 L83 31 L81 38 Z" fill="#242b30" />
            )}
            <path d="M101 37 Q104 35 107 37" stroke="#46352d" strokeWidth="1.7" fill="none" strokeLinecap="round" />
            <ellipse cx="105" cy="40" rx="1.6" ry="2" fill="#243039" />
            <path d="M102 48 Q106 51 110 47" stroke="#9d5e4c" strokeWidth="1.2" fill="none" strokeLinecap="round" />
            {gender === "man" && <path d="M96 51 Q104 59 111 49 L108 57 L100 59 Z" fill="#42312b" opacity=".9" />}
            {gender === "woman" && <path d="M91 53 Q101 60 111 51 L108 58 L98 60 Z" fill="#332726" opacity=".9" />}
          </g>
        </svg>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
