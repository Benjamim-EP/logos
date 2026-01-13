
- **Status:** Accepted
    
- **Date:** 2025-01-13
    
- **Context:**  
    The "Logos" platform faces a significant disparity in processing speeds between its modules.
    
    1. **Ingestion:** The Ingestion Service (Go) can accept file uploads and stream data to Cloud Storage in milliseconds.
        
    2. **Processing:** The AI Processor (Java) performs heavy computational tasks (PDF text extraction) and relies on external APIs (OpenAI) with variable latency, taking seconds or even minutes to complete a transaction.
        
    
    Using synchronous HTTP (REST) communication between these services creates **Temporal Coupling**. If the AI Processor is slow or down, the Ingestion Service blocks or times out, resulting in a poor user experience. Furthermore, a traffic spike in uploads (e.g., bulk import) could overwhelm the AI Processor, causing cascading failures.
    
- **Decision:**  
    We will adopt an **Asynchronous, Event-Driven Communication** pattern using **Apache Kafka** as the message broker.
    
    - The Ingestion Service will act as a **Producer**, publishing an IngestionEvent (containing metadata and storage pointers) to a topic.
        
    - The AI Processor will act as a **Consumer**, processing messages at its own pace.
        
    - Direct HTTP calls between internal services for core write operations are forbidden.
        
- **Consequences:**
    
    - **Positive:**
        
        - **Temporal Decoupling:** The Producer does not require the Consumer to be online. This improves system availability.
            
        - **Load Leveling (Backpressure):** Kafka acts as a buffer. During traffic spikes, the queue grows, but the AI Processor continues to operate at maximum efficiency without crashing (Throttling).
            
        - **Durability & Replayability:** Unlike ephemeral queues (e.g., Redis Pub/Sub), Kafka persists the log. If the AI Processor crashes, it can replay events from the last committed offset, ensuring **At-Least-Once** delivery.
            
    - **Negative:**
        
        - **Infrastructure Complexity:** Requires managing a Kafka cluster (or paying for Confluent Cloud) and handling Schema Registry.
            
        - **Eventual Consistency:** The UI cannot immediately show the result of the processing. We must implement polling or WebSockets to notify the user when the AI analysis is ready.
            
        - **Debugging:** Tracing a transaction becomes harder as it jumps across process boundaries (mitigated by OpenTelemetry).
            
- **References:**
    
    - Designing Data-Intensive Applications (Martin Kleppmann) - Chapter 11: "Stream Processing" and "The Log abstraction".
        
    - Building Microservices (Sam Newman) - Chapter 4: "Asynchronous Non-blocking Architecture".
        
    - Enterprise Integration Patterns (Hohpe & Woolf) - "Guaranteed Delivery" and "Message Bus" patterns.