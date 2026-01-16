# Troubleshooting: Pinecone Semantic Search with Empty Query

### Context

We implemented a "Tour Mode" where guest users can explore pre-ingested datasets (e.g., The Bible) without typing a search query.
The requirement was to fetch N vectors filtered only by metadata (universe='bible'), disregarding semantic similarity.

### The Problem

Initial attempts to fetch data using LangChain4j resulted in empty lists or errors, even though data existed in Pinecone.
We identified that the EmbeddingSearchRequest requires a query vector. Passing a vector initialized with absolute zeros ([0.0, 0.0, ...]) caused a mathematical edge case in Cosine Similarity calculations.

#### Formula

$$Similarity=(A⋅B)/(∥A∥⋅∥B∥)$$

Issue: If Vector A is all zeros, its magnitude $( ∥ A ∥)$ is 0. Division by zero leads to undefined/NaN scores, causing Pinecone to drop the results.

#### The Solution: "Noisy" Dummy Vector

Instead of a zeroed vector, we initialized a dummy vector with random noise or minimal values (0.001).

```java
float[] dummyVector = new float[1536]; 
for (int i = 0; i < dummyVector.length; i++) {
    // Generate minimal noise to ensure vector magnitude > 0
    dummyVector[i] = (float) Math.random(); 
}
```

This ensures the math holds up. Since we set minScore(0.0), the random similarity score is ignored, and the Metadata Filter (universe='bible') acts as the sole retrieval criteria.