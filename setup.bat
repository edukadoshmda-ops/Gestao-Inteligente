@echo off
echo ================================================
echo   SETUP - App Gestao Inteligente
echo ================================================
echo.

echo [1/3] Limpando node_modules do frontend...
if exist "frontend\node_modules" (
    rmdir /s /q "frontend\node_modules"
    echo     OK - node_modules removido
) else (
    echo     OK - node_modules nao existia
)

echo.
echo [2/3] Instalando dependencias do frontend...
cd frontend
npm install
if %ERRORLEVEL% NEQ 0 (
    echo     ERRO no npm install!
    pause
    exit /b 1
)
cd ..
echo     OK - dependencias instaladas

echo.
echo [3/3] Iniciando servidor de desenvolvimento...
echo     Acesse: http://localhost:3000
echo.
npm run dev --prefix frontend
