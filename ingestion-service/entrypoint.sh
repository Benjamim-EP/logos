#!/bin/sh

# Se a variável de ambiente com o conteúdo do JSON existir
if [ -n "$GCP_CREDENTIALS_JSON" ]; then
    echo "🔐 [Go] Criando arquivo credentials.json..."
    echo "$GCP_CREDENTIALS_JSON" > /app/credentials.json
    # Define a variável que a lib do Google busca automaticamente
    export GOOGLE_APPLICATION_CREDENTIALS="/app/credentials.json"
fi

echo "🚀 Iniciando Ingestion Service (Go)..."
./ingestion-app