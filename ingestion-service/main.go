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
   
	godotenv.Load()


	bucketName = os.Getenv("GCP_BUCKET_NAME")
	if bucketName == "" {
		log.Fatal("GCP_BUCKET_NAME is required")
	}

	initKafka()
	initStorage()

	r := gin.Default()
    
    r.GET("/actuator/health", func(c *gin.Context) {
        c.JSON(200, gin.H{"status": "UP", "runtime": "Go"})
    })

	r.POST("/api/ingestion", handleUpload)

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("🚀 Ingestion Service (Go) running on port %s", port)
	r.Run(":" + port)
}

func handleUpload(c *gin.Context) {
	fileHeader, err := c.FormFile("file")
	if err != nil {
		c.JSON(400, gin.H{"error": "File is required"})
		return
	}


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

	
    fileBytes, _ := io.ReadAll(file)
    fileSize := int64(len(fileBytes))
    
    hash := sha256.Sum256(fileBytes)
    hashString := hex.EncodeToString(hash[:])

   
    file.Seek(0, 0)

	
	storagePath := fmt.Sprintf("uploads/%s/%s", hashString, fileHeader.Filename)
	ctx := context.Background()
	
	wc := storageClient.Bucket(bucketName).Object(storagePath).NewWriter(ctx)
	wc.ContentType = fileHeader.Header.Get("Content-Type")
	
    
	if _, err := wc.Write(fileBytes); err != nil {
		c.JSON(500, gin.H{"error": "Failed to upload to GCS"})
		return
	}
	if err := wc.Close(); err != nil {
		c.JSON(500, gin.H{"error": "Failed to close GCS writer"})
		return
	}

	log.Printf("☁️ Upload GCS: %s (%d bytes)", storagePath, fileSize)

	
	event := IngestionEvent{
		FileHash:          hashString,
		S3Key:             storagePath,
		OriginalName:      fileHeader.Filename,
		UserId:            userId, 
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

    
    payload, err := base64.RawURLEncoding.DecodeString(tokenParts[1])
    if err != nil {
        return "decode-error"
    }

    var claims map[string]interface{}
    json.Unmarshal(payload, &claims)

    if val, ok := claims["preferred_username"].(string); ok {
        return val
    }
    if val, ok := claims["sub"].(string); ok {
        return val
    }
    
    return "unknown"
}