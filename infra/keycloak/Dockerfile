# Estágio 1: Build Otimizado
FROM quay.io/keycloak/keycloak:23.0.0 as builder

# Habilita suporte a Postgres e Métricas
ENV KC_HEALTH_ENABLED=true
ENV KC_METRICS_ENABLED=true
ENV KC_DB=postgres

WORKDIR /opt/keycloak
# O comando build otimiza a inicialização para Postgres
RUN /opt/keycloak/bin/kc.sh build

# Estágio 2: Runtime (Imagem Final)
FROM quay.io/keycloak/keycloak:23.0.0
COPY --from=builder /opt/keycloak/ /opt/keycloak/

# Apenas define que o driver é Postgres. 
# A URL, Usuário e Senha virão do comando 'gcloud deploy' (Variáveis de Ambiente)
ENV KC_DB=postgres

# Define o Entrypoint otimizado para produção
# --proxy=edge é crucial para o Google Cloud Run (HTTPS)
ENTRYPOINT ["/opt/keycloak/bin/kc.sh", "start", "--optimized", "--proxy=edge"]