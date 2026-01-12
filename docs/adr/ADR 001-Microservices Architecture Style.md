# 001. Adoption of Microservices Architecture

- **Status:** Accepted
    
- **Date:** 2025-01-12
    
- **Context:**  
    The "Logos" platform requires distinct types of workloads with conflicting resource requirements.
    
    1. **Ingestion Phase:** High concurrency, network I/O intensive (uploading files), but low CPU usage. Requires rapid auto-scaling to handle burst traffic.
        
    2. **Processing Phase:** Heavy interaction with LLMs (AI), high latency dependence, and complex business logic (DDD).
        
    
    Developing this as a Monolithic application would force us to scale the entire application based on the bottleneck of the heaviest component. Furthermore, a monolith would lock the entire stack into a single programming language, preventing the optimization of specific modules (e.g., using Go for high-throughput edge services).
    
- **Decision:**  
    We will adopt a **Microservices Architecture** style.  
    The system will be decomposed into loosely coupled, independently deployable services organized by business capabilities (Ingestion, Library Core, AI Processing).
    
- **Consequences:**
    
    - **Positive:**
        
        - **Independent Scalability:** The ingestion-api can be scaled based on network traffic, while the ai-processor scales based on queue lag/CPU, optimizing cloud costs.
            
        - **Polyglot Programming:** Enabled the migration of the edge ingestion service to **Go** for performance, while keeping complex domain logic in **Java/Spring Boot**.
            
        - **Fault Isolation:** A failure in the AI processing layer does not prevent users from uploading new documents.
            
    - **Negative:**
        
        - **Operational Complexity:** Requires a robust infrastructure for orchestration (Cloud Run), distributed tracing (OpenTelemetry), and centralized logging.
            
        - **Data Consistency:** We lose ACID transactions across boundaries. We must rely on eventual consistency patterns.
            
        - **Network Latency:** Inter-service communication introduces network hops not present in-memory function calls.


- **References:**
    
    - Building Microservices (Sam Newman) - Chapter 1: "Independent Deployability" and "Technology Heterogeneity".
        
    - The Twelve-Factor App - "IX. Disposability" (Fast startup and graceful shutdown).
        
    - Domain-Driven Design (Eric Evans) - Bounded Contexts alignment with service boundaries.