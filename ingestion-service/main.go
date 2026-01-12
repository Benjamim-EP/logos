package main

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"os"
	"strings"
	"time"
	"encoding/base64"

	"cloud.google.com/go/storage"
	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
	"github.com/segmentio/kafka-go"
	"github.com/segmentio/kafka-go/sasl/plain"
    "crypto/tls"
)

// Estrutura idêntica ao Record Java (IngestionEvent)
type IngestionEvent struct {
	FileHash          string `json:"fileHash"`
	S3Key             string `json:"s3Key"`
	OriginalName      string `json:"originalName"`
	UserId            string `json:"userId"`
	Timestamp         int64  `json:"timestamp"`
	FileSize          int64  `json:"fileSize"`
	PreferredLanguage string `json:"preferredLanguage"`
}

var (
	kafkaWriter *kafka.Writer
	storageClient *storage.Client
	bucketName string
)

func main() {
    // Carrega .env se existir (dev local)
	godotenv.Load()

	// Configurações
	bucketName = os.Getenv("GCP_BUCKET_NAME")
	if bucketName == "" {
		log.Fatal("GCP_BUCKET_NAME is required")
	}

	initKafka()
	initStorage()

	// Setup Web Server (Gin)
	r := gin.Default()
    
    // Rota de Health Check (Padrão Kubernetes)
    r.GET("/actuator/health", func(c *gin.Context) {
        c.JSON(200, gin.H{"status": "UP", "runtime": "Go"})
    })

	// Rota de Upload
	r.POST("/api/ingestion", handleUpload)

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("🚀 Ingestion Service (Go) running on port %s", port)
	r.Run(":" + port)
}

func handleUpload(c *gin.Context) {
	// 1. Recebe o arquivo e metadados
	fileHeader, err := c.FormFile("file")
	if err != nil {
		c.JSON(400, gin.H{"error": "File is required"})
		return
	}

    // Extrai Headers (Auth e Lang)
    // Em produção real, validaríamos o JWT. Aqui confiamos no Gateway.
    // O Gateway passa o token, e podemos extrair o "sub" (userId) se decodificarmos.
    // Para simplificar o MVP e manter compatibilidade com o teste local,
    // vamos pegar um Header simulado ou extrair do JWT se você quiser implementar o parser.
    // Por enquanto, vamos assumir que o Gateway validou.
    // TODO: Implementar JWT Decode para extrair userId real do header Authorization.
    
    // Workaround para teste local: Pegamos um header X-User-Id ou usamos um default
    userId := extractUserIdFromToken(c.GetHeader("Authorization"))
    
    lang := c.GetHeader("Accept-Language")
    if lang == "" {
        lang = "en"
    }

	file, err := fileHeader.Open()
	if err != nil {
		c.JSON(500, gin.H{"error": "Failed to open file"})
		return
	}
	defer file.Close()

	// 2. Calcula Hash (SHA256) enquanto lê? 
    // Go é esperto. Para não ler duas vezes, vamos ler para um buffer ou calcular on-the-fly.
    // Abordagem simples: Ler para memória (limitado a 10MB pelo componente frontend)
    // Se fosse arquivo de 1GB, usaríamos TeeReader.
    fileBytes, _ := io.ReadAll(file)
    fileSize := int64(len(fileBytes))
    
    hash := sha256.Sum256(fileBytes)
    hashString := hex.EncodeToString(hash[:])

    // Reinicia ponteiro de leitura para upload
    file.Seek(0, 0)

	// 3. Upload para Google Cloud Storage
	storagePath := fmt.Sprintf("uploads/%s/%s", hashString, fileHeader.Filename)
	ctx := context.Background()
	
	wc := storageClient.Bucket(bucketName).Object(storagePath).NewWriter(ctx)
	wc.ContentType = fileHeader.Header.Get("Content-Type")
	
    // Escreve os bytes no GCS
	if _, err := wc.Write(fileBytes); err != nil {
		c.JSON(500, gin.H{"error": "Failed to upload to GCS"})
		return
	}
	if err := wc.Close(); err != nil {
		c.JSON(500, gin.H{"error": "Failed to close GCS writer"})
		return
	}

	log.Printf("☁️ Upload GCS: %s (%d bytes)", storagePath, fileSize)

	// 4. Publica no Kafka
	event := IngestionEvent{
		FileHash:          hashString,
		S3Key:             storagePath,
		OriginalName:      fileHeader.Filename,
		UserId:            userId, // Em prod, virá do JWT
		Timestamp:         time.Now().UnixMilli(),
		FileSize:          fileSize,
		PreferredLanguage: lang,
	}

	eventJson, _ := json.Marshal(event)

	err = kafkaWriter.WriteMessages(ctx, kafka.Message{
		Key:   []byte(hashString),
		Value: eventJson,
	})

	if err != nil {
		log.Printf("❌ Kafka Error: %v", err)
		c.JSON(500, gin.H{"error": "Failed to publish event"})
		return
	}

	log.Printf("📨 Evento enviado para Kafka: %s", hashString)
	c.String(202, hashString)
}

func initStorage() {
	ctx := context.Background()
	client, err := storage.NewClient(ctx)
	if err != nil {
		log.Fatal("Failed to create GCS client:", err)
	}
	storageClient = client
}

func initKafka() {
    // Configurações do Confluent Cloud
    broker := os.Getenv("KAFKA_BROKER")
    user := os.Getenv("KAFKA_USER")
    pass := os.Getenv("KAFKA_PASS")

	dialer := &kafka.Dialer{
		Timeout:   10 * time.Second,
		DualStack: true,
        SASLMechanism: plain.Mechanism{
            Username: user,
            Password: pass,
        },
        TLS: &tls.Config{
            MinVersion: tls.VersionTLS12,
        },
	}

	kafkaWriter = kafka.NewWriter(kafka.WriterConfig{
		Brokers:  []string{broker},
		Topic:    "document.ingestion",
		Dialer:   dialer,
		Balancer: &kafka.LeastBytes{},
	})
}

// Função leve para extrair dados do Payload do JWT (parte do meio)
func extractUserIdFromToken(authHeader string) string {
    if authHeader == "" {
        return "anonymous"
    }
    
    parts := strings.Split(authHeader, " ")
    if len(parts) != 2 {
        return "invalid-token"
    }
    token := parts[1]

    tokenParts := strings.Split(token, ".")
    if len(tokenParts) < 2 {
        return "invalid-jwt"
    }

    // Decode Payload
    payload, err := base64.RawURLEncoding.DecodeString(tokenParts[1])
    if err != nil {
        return "decode-error"
    }

    var claims map[string]interface{}
    json.Unmarshal(payload, &claims)

    // Tenta pegar 'preferred_username' ou 'sub'
    if val, ok := claims["preferred_username"].(string); ok {
        return val
    }
    if val, ok := claims["sub"].(string); ok {
        return val
    }
    
    return "unknown"
}