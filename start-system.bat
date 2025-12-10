@echo off
color 0A
echo ========================================================
echo        AI KNOWLEDGE ORGANIZER - SYSTEM LAUNCHER
echo ========================================================
echo.

:: 1. Verificacao de Infraestrutura
echo [1/3] Verificando Infraestrutura (Docker)...
docker ps | findstr "minio" >nul
if %errorlevel% neq 0 (
    color 0C
    echo [ERRO] O container MinIO nao foi encontrado!
    echo Por favor, execute 'docker-compose up -d' primeiro.
    pause
    exit /b
)

docker ps | findstr "redis" >nul
if %errorlevel% neq 0 (
    color 0C
    echo [ERRO] O container Redis nao foi encontrado!
    echo Por favor, execute 'docker-compose up -d' primeiro.
    pause
    exit /b
)
echo [OK] Docker (MinIO e Redis) esta rodando.
echo.

:: 2. Iniciando Ingestion API
echo [2/3] Iniciando API de Ingestao (Porta 8080)...
:: Abre uma nova janela, muda a cor, define o titulo e roda o maven
start "API - INGESTION (Port 8080)" cmd /k "color 0B && cd ingestion-api && title [API] Ingestion Gateway && echo Iniciando Spring Boot... && mvn spring-boot:run"

:: Pequena pausa para nao travar a CPU compilando tudo junto
timeout /t 5 >nul

:: 3. Iniciando AI Processor
echo [3/3] Iniciando AI Processor (Porta 8081)...
start "WORKER - AI PROCESSOR (Port 8081)" cmd /k "color 0D && cd ai-processor && title [WORKER] AI Processor && echo Iniciando Spring Boot... && mvn spring-boot:run"

echo.
echo ========================================================
echo    SISTEMA INICIADO COM SUCESSO!
echo ========================================================
echo Fique de olho nas duas janelas que abriram.
echo Para testar, abra outro terminal e use o curl.
echo.
pause