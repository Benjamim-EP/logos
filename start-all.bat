@echo off
color 0B

:: ==================================================================================
:: CONFIGURAÇÃO DE OBSERVABILIDADE (GRAFANA CLOUD)
:: ==================================================================================

:: 1. Raiz do projeto
set PROJECT_ROOT=%~dp0

:: 2. Configurações do Grafana (Credenciais que você já configurou)
set OTEL_ENDPOINT=https://otlp-gateway-prod-us-west-0.grafana.net/otlp
set OTEL_TOKEN=MTQ5MTU0NzpnbGNfZXlKdklqb2lNVFl6TnpnNU5DSXNJbTRpT2lKNWIzVnlMV2R5WVdaaGJtRXRkRzlyWlc0aUxDSnJJam9pT0dNNE5YYzFOalpaYmtkdFpFRm1kamhZZUVzek16UlBJaXdpYlNJNmV5SnlJam9pY0hKdlpDMTFjeTEzWlhOMExUQWlmWDA9

:: 3. Caminho do Agente
set AGENT_PATH=%PROJECT_ROOT%infra\monitoring\opentelemetry-javaagent.jar

:: 4. Argumentos da JVM (OTel Agent)
set OHEL_ARGS=-javaagent:"%AGENT_PATH%" -Dotel.exporter.otlp.endpoint=%OTEL_ENDPOINT% -Dotel.exporter.otlp.headers="Authorization=Basic %OTEL_TOKEN%" -Dotel.exporter.otlp.protocol=http/protobuf -Dotel.metrics.exporter=otlp -Dotel.logs.exporter=otlp -Dotel.traces.exporter=otlp

echo.
echo ===================================================================
echo    LOGOS PLATFORM - OBSERVABILITY ENABLED
echo ===================================================================
echo    Agent: OpenTelemetry Java (Auto-Instrumentation)
echo    Target: Grafana Cloud (SaaS)
echo    Docker: DISABLED (Fully Serverless Architecture)
echo ===================================================================
echo.

:: 1. LIBRARY SERVICE
echo [1/5] Iniciando Library Service...
start "CORE - LIBRARY" cmd /k "color 0A && cd library-service && title [LIBRARY] OTel On && set JAVA_TOOL_OPTIONS=%OHEL_ARGS% -Dotel.service.name=library-service && mvn spring-boot:run"
timeout /t 3 >nul

:: 2. INGESTION API
echo [2/5] Iniciando Ingestion API...
start "API - INGESTION" cmd /k "color 0B && cd ingestion-api && title [INGESTION] OTel On && set JAVA_TOOL_OPTIONS=%OHEL_ARGS% -Dotel.service.name=ingestion-api && mvn spring-boot:run"
timeout /t 3 >nul

:: 3. AI PROCESSOR
echo [3/5] Iniciando AI Processor...
start "WORKER - AI" cmd /k "color 0D && cd ai-processor && title [AI WORKER] OTel On && set JAVA_TOOL_OPTIONS=%OHEL_ARGS% -Dotel.service.name=ai-processor && mvn spring-boot:run"
timeout /t 3 >nul

:: 4. API GATEWAY
echo [4/5] Iniciando Gateway...
start "GATEWAY" cmd /k "color 0E && cd api-gateway && title [GATEWAY] OTel On && set JAVA_TOOL_OPTIONS=%OHEL_ARGS% -Dotel.service.name=api-gateway && mvn spring-boot:run"
timeout /t 2 >nul

:: 5. FRONTEND
echo [5/5] Iniciando Frontend...
start "FRONTEND - VITE" cmd /k "color 0F && cd logos-web && title [WEB] React && npm run dev"

echo.
echo ========================================================
echo    SISTEMA RODANDO 100% CONECTADO A NUVEM
echo ========================================================
echo.
echo  [INFRAESTRUTURA EXTERNA]
echo   - Auth:   Keycloak (Google Cloud Run)
echo   - DB:     Postgres (Neon AWS)
echo   - Cache:  Redis (Upstash)
echo   - Obs:    Grafana/Loki/Tempo (Grafana Cloud)
echo.
echo  [SERVICOS LOCAIS]
echo   - Frontend: http://localhost:5173
echo   - Gateway:  http://localhost:8000
echo.
pause