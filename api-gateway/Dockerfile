# --- Estágio 1: Build (Compilação) ---
FROM maven:3.9.6-eclipse-temurin-21-alpine AS build
WORKDIR /app

# Copia apenas o pom.xml primeiro para cachear as dependências (ficar mais rápido)
COPY pom.xml .
RUN mvn dependency:go-offline

# Copia o código fonte e compila
COPY src ./src
RUN mvn clean package -DskipTests

# --- Estágio 2: Runtime (Execução) ---
FROM eclipse-temurin:21-jre-alpine
WORKDIR /app

# Instala dependências básicas se necessário (ex: fontes para PDFBox, curl para healthcheck)
RUN apk add --no-cache fontconfig ttf-dejavu curl

# Cria um usuário não-root por segurança
RUN addgroup -S spring && adduser -S spring -G spring
USER spring:spring

# Copia o JAR do estágio de build
COPY --from=build /app/target/*.jar app.jar

# Script de entrada para lidar com credenciais (explicarei abaixo)
COPY entrypoint.sh .
USER root
RUN chmod +x entrypoint.sh
USER spring:spring

# Expõe a porta (será ignorado pelo Compose, mas é boa prática)
EXPOSE 8080

# Usa o script de entrada
ENTRYPOINT ["./entrypoint.sh"]