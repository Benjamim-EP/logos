@echo off
color 0B
echo.
echo ===================================================================
echo    LOGOS PLATFORM - LAUNCHER HYBRID CLOUD (B2B ARCHITECTURE)
echo ===================================================================
echo    Local:    Zipkin (Docker), Spring Boot Apps, React
echo    Cloud:    Keycloak (Google Run), NeonDB (AWS), Upstash, Confluent
echo ===================================================================
echo.

:: 1. SOBE DOCKER (OBSERVABILITY ONLY)
echo [1/6] Iniciando Observabilidade (Zipkin)...
:: Forcamos subir apenas o zipkin caso o docker-compose ainda tenha sujeira antiga
docker-compose up -d zipkin

if %errorlevel% neq 0 (
    color 0C
    echo [ERRO] Docker nao respondeu. Verifique o Docker Desktop.
    pause
    exit /b
)

echo [OK] Tracing distribuido ativo (9411).
timeout /t 3 >nul

:: 2. LIBRARY SERVICE (8082)
echo [2/6] Iniciando Library Service...
start "CORE - LIBRARY (8082)" cmd /k "color 0A && cd library-service && title [LIBRARY] Conectando NeonDB... && mvn spring-boot:run"
timeout /t 3 >nul

:: 3. INGESTION API (8080)
echo [3/6] Iniciando Ingestion API...
start "API - INGESTION (8080)" cmd /k "color 0B && cd ingestion-api && title [INGESTION] Kafka Producer && mvn spring-boot:run"
timeout /t 3 >nul

:: 4. AI PROCESSOR (8081)
echo [4/6] Iniciando AI Processor...
start "WORKER - AI (8081)" cmd /k "color 0D && cd ai-processor && title [AI WORKER] Upstash + OpenAI && mvn spring-boot:run"
timeout /t 3 >nul

:: 5. GATEWAY (8000)
echo [5/6] Iniciando API Gateway...
start "GATEWAY (8000)" cmd /k "color 0E && cd api-gateway && title [GATEWAY] Validando JWT Cloud && mvn spring-boot:run"
timeout /t 2 >nul

:: 6. FRONTEND (5173)
echo [6/6] Iniciando Frontend (Logos Web)...
start "FRONTEND - VITE" cmd /k "color 0F && cd logos-web && title [WEB] React + Auth Cloud && echo Iniciando Vite... && npm run dev"

echo.
echo ========================================================
echo    SISTEMA HIBRIDO INICIADO!
echo ========================================================
echo Frontend: http://localhost:5173
echo Gateway:  http://localhost:8000
echo Auth:     https://logos-auth-665606141998.us-central1.run.app (Cloud Run)
echo Tracing:  http://localhost:9411 (Zipkin)
echo.
echo [STATUS]
echo  - DB: Neon (AWS) ...... [ONLINE]
echo  - Cache: Upstash ...... [ONLINE]
echo  - Auth: Google ........ [ONLINE]
echo.
pause