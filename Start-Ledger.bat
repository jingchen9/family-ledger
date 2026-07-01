@echo off
setlocal

cd /d "%~dp0"
set APP_URL=http://localhost:5173/

call :ensure_vcredist
if errorlevel 1 (
  pause
  exit /b 1
)

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js is not installed.
  echo Install Node.js LTS first, then double-click this file again:
  echo https://nodejs.org/
  pause
  exit /b 1
)

where npm.cmd >nul 2>nul
if errorlevel 1 (
  echo npm was not found. Reinstall Node.js LTS, then double-click this file again.
  pause
  exit /b 1
)

if not exist node_modules (
  echo Installing project dependencies. This only happens the first time...
  call npm.cmd install
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
call npm.cmd run dev -- --host 127.0.0.1 --port 5173 --strictPort
pause
exit /b %errorlevel%

:ensure_vcredist
call :has_vcredist x64
set HAS_VC_X64=%errorlevel%
call :has_vcredist x86
set HAS_VC_X86=%errorlevel%
if "%HAS_VC_X64%"=="0" if "%HAS_VC_X86%"=="0" exit /b 0

echo Microsoft Visual C++ Redistributable is missing or incomplete.
echo This computer needs the 2015-2022 x64 and x86 runtimes before the ledger can start reliably.
where winget >nul 2>nul
if errorlevel 1 (
  echo Install Microsoft Visual C++ Redistributable 2015-2022 x64 and x86, then double-click this file again:
  echo https://learn.microsoft.com/cpp/windows/latest-supported-vc-redist
  exit /b 1
)

choice /C YN /M "Install or update Microsoft Visual C++ Redistributable now"
if errorlevel 2 exit /b 1

winget install -e --id Microsoft.VCRedist.2015+.x64 --accept-source-agreements --accept-package-agreements
if errorlevel 1 exit /b 1
winget install -e --id Microsoft.VCRedist.2015+.x86 --accept-source-agreements --accept-package-agreements
if errorlevel 1 exit /b 1

call :has_vcredist x64
if errorlevel 1 exit /b 1
call :has_vcredist x86
if errorlevel 1 exit /b 1
exit /b 0

:has_vcredist
reg query "HKLM\SOFTWARE\Microsoft\VisualStudio\14.0\VC\Runtimes\%~1" /v Installed 2>nul | find "0x1" >nul
if not errorlevel 1 exit /b 0
reg query "HKLM\SOFTWARE\WOW6432Node\Microsoft\VisualStudio\14.0\VC\Runtimes\%~1" /v Installed 2>nul | find "0x1" >nul
exit /b %errorlevel%
