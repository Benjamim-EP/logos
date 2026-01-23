#!/bin/sh

# Se a variável GCP_CREDENTIALS_JSON existir, cria o arquivo credentials.json
if [ -n "$GCP_CREDENTIALS_JSON" ]; then
    echo "🔐 Criando arquivo de credenciais GCP..."
    echo "$GCP_CREDENTIALS_JSON" > /app/credentials.json
fi

# Inicia a aplicação Java
# -Djava.security.egd acelera a inicialização em Linux
echo "🚀 Iniciando aplicação Spring Boot..."
exec java -Djava.security.egd=file:/dev/./urandom -jar app.jar