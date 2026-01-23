# --- Estágio 1: Build ---
FROM golang:1.22-alpine AS build

WORKDIR /app

# Instala dependências do sistema necessárias para o Kafka (se usar CGO) ou certificados
RUN apk add --no-cache git

# Copia e baixa dependências
COPY go.mod go.sum ./
RUN go mod download

# Copia o código fonte
COPY . .

# Compila o binário
# CGO_ENABLED=0 garante um binário estático puro
RUN CGO_ENABLED=0 GOOS=linux go build -o ingestion-app main.go

# --- Estágio 2: Runtime ---
FROM alpine:latest

WORKDIR /app

# Instala certificados CA para HTTPS (necessário para GCS e Kafka)
RUN apk --no-cache add ca-certificates bash

# Copia o binário do estágio de build
COPY --from=build /app/ingestion-app .

# Copia o script de entrypoint
COPY entrypoint.sh .
RUN chmod +x entrypoint.sh

# Expose port (documentação)
EXPOSE 8080

ENTRYPOINT ["./entrypoint.sh"]