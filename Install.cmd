@echo off
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0install\windows.ps1" -Action install %*
exit /b %errorlevel%
