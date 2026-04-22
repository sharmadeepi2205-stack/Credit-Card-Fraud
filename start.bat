@echo off
echo ========================================
echo  FraudGuard - Local Dev Startup
echo ========================================

REM ── Backend ──────────────────────────────
echo.
echo [1/4] Installing backend dependencies...
cd webapp\backend
pip install -r requirements.txt
if errorlevel 1 (echo ERROR: pip install failed & pause & exit /b 1)

echo.
echo [2/4] Seeding database (skip if already seeded)...
python seed.py 2>nul || echo (Seed skipped - DB may already exist)

echo.
echo [3/4] Starting backend on http://localhost:8000 ...
start "FraudGuard Backend" cmd /k "uvicorn app.main:app --reload --port 8000"

REM ── Frontend ─────────────────────────────
echo.
echo [4/4] Installing frontend dependencies and starting dev server...
cd ..\frontend
call npm install
if errorlevel 1 (echo ERROR: npm install failed & pause & exit /b 1)

start "FraudGuard Frontend" cmd /k "npm run dev"

echo.
echo ========================================
echo  App is starting up!
echo  Frontend : http://localhost:5173
echo  Backend  : http://localhost:8000
echo  API Docs : http://localhost:8000/docs
echo.
echo  Admin : admin@fraudguard.dev / Admin1234!
echo  Demo  : demo@fraudguard.dev  / Demo1234!
echo ========================================
pause
