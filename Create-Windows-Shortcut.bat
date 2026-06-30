@echo off
setlocal

cd /d "%~dp0"

powershell -NoProfile -ExecutionPolicy Bypass -Command "$ErrorActionPreference = 'Stop'; $project = (Resolve-Path '.').Path; $desktop = [Environment]::GetFolderPath('Desktop'); $shortcutPath = Join-Path $desktop 'Family Ledger.lnk'; $emptyShortcut = Join-Path $desktop '.lnk'; if (Test-Path -LiteralPath $emptyShortcut) { Remove-Item -LiteralPath $emptyShortcut -Force }; $shell = New-Object -ComObject WScript.Shell; $shortcut = $shell.CreateShortcut($shortcutPath); $shortcut.TargetPath = Join-Path $project 'Start-Ledger.bat'; $shortcut.WorkingDirectory = $project; $shortcut.IconLocation = Join-Path $project 'assets\launcher\ledger.ico'; $shortcut.Description = 'Start Family Ledger'; $shortcut.Save(); Write-Host ('Desktop shortcut created: ' + $shortcutPath)"

if errorlevel 1 (
  echo Failed to create the desktop shortcut.
  pause
  exit /b 1
)

pause
