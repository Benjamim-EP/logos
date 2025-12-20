@echo off
color 0B
echo ========================================================
echo      LOGOS PLATFORM - BACKEND CORE LAUNCHER
echo          (Gateway + Library Service)
echo ========================================================
echo.

:: 1. Verificação de Pré-requisitos (Keycloak)
echo [1/3] Verificando Keycloak (Identity Provider)...
docker ps | findstr "keycloak" >nul
if %errorlevel% neq 0 (
    color 0C
    echo [ERRO] O container Keycloak nao foi encontrado ou esta parado!
    echo O API Gateway PRECISA do Keycloak rodando na porta 8085 para iniciar.
    echo.
    echo Solucao: Execute 'docker-compose up -d keycloak' e tente novamente.
    pause
    exit /b
)
echo [OK] Keycloak detectado.
echo.

:: 2. Iniciando API Gateway
echo [2/3] Iniciando API Gateway (Porta 8000)...
:: CORREÇÃO: Removido o "&" do título que causava o erro
start "INFRA - API GATEWAY (8000)" cmd /k "color 0E && cd api-gateway && title [GATEWAY] Security Routing && echo Conectando ao Keycloak... && mvn spring-boot:run"

:: Pausa para não sobrecarregar o Maven rodando dois builds simultâneos
timeout /t 5 >nul

:: 3. Iniciando Library Service
echo [3/3] Iniciando Library Service (Porta 8082)...
start "CORE - LIBRARY SERVICE (8082)" cmd /k "color 0A && cd library-service && title [LIBRARY] CMS Service && echo Conectando ao NeonDB... && mvn spring-boot:run"

echo.
echo ========================================================
echo    SERVICOS INICIADOS COM SUCESSO!
echo ========================================================
echo Gateway: http://localhost:8000 (Use este no Frontend)
echo Library: http://localhost:8082 (Interno)
echo.
echo Mantenha esta janela aberta ou pode fecha-la, 
echo os servicos estao rodando em janelas separadas.
pause