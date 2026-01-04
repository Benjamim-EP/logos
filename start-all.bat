@echo off
color 0B
echo.
echo ===================================================================
echo    LOGOS PLATFORM - LAUNCHER CLOUD NATIVE
echo ===================================================================
echo    Infra:    Keycloak, Redis, Zipkin (Docker)
echo    Cloud:    NeonDB (Postgres), Google Storage, Confluent Kafka
echo    Web:      React (Vite)
echo ===================================================================
echo.

:: 1. SOBE DOCKER (LIGTHWEIGHT)
echo [1/6] Iniciando Infraestrutura Docker (Sem Oracle/MinIO)...
docker-compose up -d --remove-orphans

if %errorlevel% neq 0 (
    color 0C
    echo [ERRO] Docker nao respondeu. Verifique se o Docker Desktop esta aberto.
    pause
    exit /b
)

echo [OK] Containers subindo. Aguardando 5s...
timeout /t 5 >nul

:: 2. LIBRARY SERVICE (8082)
echo [2/6] Iniciando Library Service (CMS)...
start "CORE - LIBRARY (8082)" cmd /k "color 0A && cd library-service && title [LIBRARY] NeonDB + GCS && mvn spring-boot:run"
timeout /t 3 >nul

:: 3. INGESTION API (8080)
echo [3/6] Iniciando Ingestion API (Escrita)...
start "API - INGESTION (8080)" cmd /k "color 0B && cd ingestion-api && title [INGESTION] Upload/URL && mvn spring-boot:run"
timeout /t 3 >nul

:: 4. AI PROCESSOR (8081)
echo [4/6] Iniciando AI Processor (Worker)...
start "WORKER - AI (8081)" cmd /k "color 0D && cd ai-processor && title [AI WORKER] OpenAI + Kafka && mvn spring-boot:run"
timeout /t 3 >nul

:: 5. GATEWAY (8000)
echo [5/6] Iniciando API Gateway...
start "GATEWAY (8000)" cmd /k "color 0E && cd api-gateway && title [GATEWAY] Routing && mvn spring-boot:run"
timeout /t 2 >nul

:: 6. FRONTEND (5173) - NOVO PASSO
echo [6/6] Iniciando Frontend (Logos Web)...
start "FRONTEND - VITE" cmd /k "color 0F && cd logos-web && title [WEB] React Frontend && echo Iniciando Vite... && npm run dev"

echo.
echo ========================================================
echo    SISTEMA COMPLETO INICIANDO!
echo ========================================================
echo Frontend: http://localhost:5173  (Abrindo...)
echo Gateway:  http://localhost:8000
echo Keycloak: http://localhost:8085
echo.
echo Pode minimizar esta janela, mas nao a feche se quiser ver os status.
echo Pressione qualquer tecla para sair deste launcher...
pause >nul