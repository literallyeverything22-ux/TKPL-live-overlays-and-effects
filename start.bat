@echo off
setlocal EnableExtensions
title TKPL 2026 - Live Match Broadcast & Scorer Server (KEEP THIS WINDOW OPEN)
color 0E

set "SCRIPT_DIR=%~dp0"
if exist "%ProgramFiles%\nodejs\node.exe" set "PATH=%ProgramFiles%\nodejs;%PATH%"
if exist "%LOCALAPPDATA%\Programs\node\node.exe" set "PATH=%LOCALAPPDATA%\Programs\node;%PATH%"

echo ============================================================================
echo   TKPL 2026 - LIVE MATCH BROADCAST & SCORER STUDIO
echo ============================================================================
echo.
echo   1. LIVE SCORER & DIRECTOR STUDIO (Your Laptop):
echo      http://127.0.0.1:4280/scorer
echo.
echo   2. OBS STUDIO TRANSPARENT OVERLAY (Paste in OBS Browser Source 1920x1080):
echo      http://127.0.0.1:4280/overlay
echo.
echo   3. BROWSER PREVIEW (Test Graphics Without OBS):
echo      http://127.0.0.1:4280/overlay?bg=preview
echo.
echo   4. GREEN SCREEN OVERLAY (Optional for vMix / Hardware Mixers):
echo      http://127.0.0.1:4280/overlay?bg=green
echo ============================================================================
echo.

where node >nul 2>&1
if errorlevel 1 (
  echo [SETUP REQUIRED] Node.js is not installed on this PC yet.
  echo Please install Node.js LTS from https://nodejs.org and run start.bat again.
  start "" "https://nodejs.org/"
  pause
  exit /b 1
)

powershell -NoProfile -Command "try { $r = Invoke-WebRequest -UseBasicParsing -Uri 'http://127.0.0.1:4280/api/health' -TimeoutSec 2; if ($r.StatusCode -eq 200) { exit 0 } else { exit 1 } } catch { exit 1 }"
if %errorlevel%==0 (
  echo [OK] TKPL Match Broadcast Server is ALREADY running on port 4280!
  echo Opening Live Scorer Studio in your browser...
  start "" "http://127.0.0.1:4280/scorer"
  echo.
  echo You can close this popup window safely ^(the server is already running^).
  pause
  exit /b 0
)

cd /d "%SCRIPT_DIR%"

if not exist "%SCRIPT_DIR%node_modules" (
  echo [FIRST-TIME SETUP] Installing packages ^(takes ~30 seconds, internet needed once^)...
  call npm install --no-audit --no-fund
)

if not exist "%SCRIPT_DIR%dist\index.html" (
  echo [BUILD] Building production broadcast graphics...
  call npm run build
)

echo Starting TKPL 2026 Broadcast Server...
echo IMPORTANT: Keep this window open (minimized) during the entire match!
echo.

start "" /min powershell -NoProfile -Command "for ($i=0; $i -lt 40; $i++) { try { $r = Invoke-WebRequest -UseBasicParsing -Uri 'http://127.0.0.1:4280/api/health' -TimeoutSec 2; if ($r.StatusCode -eq 200) { Start-Process 'http://127.0.0.1:4280/scorer'; break } } catch {} Start-Sleep -Milliseconds 500 }"

node server/index.mjs
pause
