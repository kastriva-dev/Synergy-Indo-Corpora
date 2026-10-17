@echo off
chcp 65001 >nul
cd /d "%~dp0"
title Synergy Indo Corpora - Dev Server (by Kastriva)
echo ================================================
echo   SYNERGY INDO CORPORA - PREMIUM WEBSITE
  echo   by KASTRIVA - Tahap 1
echo ================================================
where node >nul 2>&1
if errorlevel 1 (
  echo Node.js belum terpasang atau tidak ditemukan di PATH.
  echo Pasang Node.js 20.9 atau lebih baru dahulu.
  pause
  exit /b 1
)
if not exist "node_modules\next" (
  echo Menginstal dependensi (memerlukan internet)...
  call npm.cmd install
  if errorlevel 1 (
    echo Instalasi gagal. Periksa koneksi internet dan versi Node.js.
    pause
    exit /b 1
  )
)
echo Website akan berjalan di http://localhost:3000
echo Tekan Ctrl+C untuk menghentikan server.
call npm.cmd run dev
pause
