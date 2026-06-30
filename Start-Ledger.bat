@echo off
setlocal

cd /d "%~dp0"
set APP_URL=http://localhost:5173/

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js is not installed.
  echo Install Node.js LTS first, then double-click this file again:
  echo https://nodejs.org/
  pause
  exit /b 1
)

where npm >nul 2>nul
if errorlevel 1 (
  echo npm was not found. Reinstall Node.js LTS, then double-click this file again.
  pause
  exit /b 1
)

if not exist node_modules (
  echo Installing project dependencies. This only happens the first time...
  call npm install
  if errorlevel 1 (
    pause
    exit /b 1
  )
)

powershell -NoProfile -ExecutionPolicy Bypass -Command "try { Invoke-WebRequest -UseBasicParsing '%APP_URL%' -TimeoutSec 1 | Out-Null; exit 0 } catch { exit 1 }"
if not errorlevel 1 (
  echo Family ledger is already running. Opening browser...
  start "" "%APP_URL%"
  exit /b 0
)

echo Starting family ledger...
start "" "%APP_URL%"
call npm run dev -- --host 127.0.0.1 --port 5173 --strictPort
pause
