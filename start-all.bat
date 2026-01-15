@echo off
color 0B

:: ==================================================================================
:: 1. DEFINIÇÃO DE CAMINHOS ABSOLUTOS (A CORREÇÃO)
:: ==================================================================================
:: %~dp0 pega o caminho completo da pasta atual (ex: D:\Projetos\logos\)
set PROJECT_ROOT=%~dp0

:: ==================================================================================
:: 2. CARREGAR .ENV (Segredos)
:: ==================================================================================
echo [ENV] Carregando variaveis de ambiente do .env...
if not exist "%PROJECT_ROOT%.env" (
    echo [ERRO] Arquivo .env nao encontrado em %PROJECT_ROOT%
    pause
    exit /b
)

:: Loop para ler linha por linha e setar variaveis
for /f "usebackq tokens=*" %%a in ("%PROJECT_ROOT%.env") do (
    set line=%%a
    :: Se não começar com #, define a variável
    if not "x!line:~0,1!"=="x#" (
        set %%a
    )
)

:: ==================================================================================
:: 3. CONFIGURAÇÃO DE OBSERVABILIDADE
:: ==================================================================================

:: Configurações do Grafana
set OTEL_ENDPOINT=https://otlp-gateway-prod-us-west-0.grafana.net/otlp
set OTEL_TOKEN=MTQ5MTU0NzpnbGNfZXlKdklqb2lNVFl6TnpnNU5DSXNJbTRpT2lKNWIzVnlMV2R5WVdaaGJtRXRkRzlyWlc0aUxDSnJJam9pT0dNNE5YYzFOalpaYmtkdFpFRm1kamhZZUVzek16UlBJaXdpYlNJNmV5SnlJam9pY0hKdlpDMTFjeTEzWlhOMExUQWlmWDA9

:: Caminho do Agente (AGORA COM CAMINHO ABSOLUTO)
set AGENT_PATH=%PROJECT_ROOT%infra\monitoring\opentelemetry-javaagent.jar

:: Verifica se o jar existe antes de tentar rodar
if not exist "%AGENT_PATH%" (
    color 0C
    echo [ERRO CRITICO] O Agente nao foi encontrado em:
    echo %AGENT_PATH%
    echo Por favor, baixe o opentelemetry-javaagent.jar para a pasta infra/monitoring.
    pause
    exit /b
)

:: Argumentos da JVM
set OHEL_ARGS=-javaagent:"%AGENT_PATH%" -Dotel.exporter.otlp.endpoint=%OTEL_ENDPOINT% -Dotel.exporter.otlp.headers="Authorization=Basic %OTEL_TOKEN%" -Dotel.exporter.otlp.protocol=http/protobuf -Dotel.metrics.exporter=otlp -Dotel.logs.exporter=otlp -Dotel.traces.exporter=otlp

echo.
echo ===================================================================
echo    LOGOS PLATFORM - OBSERVABILITY ENABLED
echo ===================================================================
echo    Raiz:   %PROJECT_ROOT%
echo    Agente: OK (Encontrado)
echo    Docker: DISABLED (Fully Serverless Architecture)
echo ===================================================================
echo.

:: 1. LIBRARY SERVICE
echo [1/5] Iniciando Library Service...
start "CORE - LIBRARY" cmd /k "color 0A && cd library-service && title [LIBRARY] OTel On && set JAVA_TOOL_OPTIONS=%OHEL_ARGS% -Dotel.service.name=library-service && mvn spring-boot:run"
timeout /t 3 >nul

:: 2. INGESTION SERVICE (GO)
echo [2/5] Iniciando Ingestion Service (Go Lang)...
start "API - INGESTION (GO)" cmd /k "color 0B && cd ingestion-service && title [INGESTION] Go Native && go run main.go"
timeout /t 2 >nul

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
pause