@echo off
setlocal
cd /d "%~dp0"

where npm >nul 2>nul
if errorlevel 1 (
  echo Node.js is not installed. Installing the current Node.js LTS...
  where winget >nul 2>nul
  if not errorlevel 1 winget install --id OpenJS.NodeJS.LTS --exact --accept-package-agreements --accept-source-agreements

  set "PATH=%ProgramFiles%\nodejs;%ProgramFiles(x86)%\nodejs;%PATH%"
  where npm >nul 2>nul
  if errorlevel 1 (
    echo Windows Package Manager did not install Node.js. Trying the official Node.js installer...
    powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\install-node.ps1"
    set "PATH=%ProgramFiles%\nodejs;%ProgramFiles(x86)%\nodejs;%PATH%"
    where npm >nul 2>nul
    if errorlevel 1 (
      echo.
      echo Node.js could not be installed automatically.
      echo Install the LTS version from https://nodejs.org/ and then run this file again.
      pause
      exit /b 1
    )
  )
)

where git >nul 2>nul
if errorlevel 1 (
  echo Git is not installed. Installing Git for automatic updates...
  where winget >nul 2>nul
  if not errorlevel 1 winget install --id Git.Git --exact --accept-package-agreements --accept-source-agreements
  set "PATH=%ProgramFiles%\Git\cmd;%PATH%"
)

where git >nul 2>nul
if errorlevel 1 (
  echo Git could not be installed automatically. The client will still start,
  echo but it cannot update itself until Git is installed from https://git-scm.com/
) else (
  if not exist .git\ (
    echo Enabling automatic Lynesque client updates...
    git init
    git remote add origin https://github.com/Lynesque/lynesque-client.git
    git fetch origin main
    if not errorlevel 1 git reset origin/main
  )

  if exist .git\ (
    echo Checking for Lynesque client updates...
    git pull --ff-only origin main
    if errorlevel 1 echo Update check failed; starting the installed version instead.
  )
)

echo Checking lynesque dependencies...
call npm install --no-audit --no-fund
if errorlevel 1 (
  echo.
  echo Dependency installation failed.
  pause
  exit /b 1
)
echo Starting the lynesque desktop client...
call npm run friend
pause
