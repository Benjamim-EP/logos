package com.ai.organizer.library.config;

import com.google.auth.oauth2.GoogleCredentials;
import com.google.cloud.storage.Storage;
import com.google.cloud.storage.StorageOptions;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.io.Resource;

import java.io.IOException;

@Configuration
public class GcpConfig {

    @Value("${spring.cloud.gcp.credentials.location}")
    private Resource credentialsLocation;

    @Value("${gcp.storage.bucket-name}") // Opcional: Se precisar do Project ID, pode injetar aqui
    private String bucketName;

    @Bean
    public Storage storage() throws IOException {
        // Carrega as credenciais do arquivo definido no application.yml
        GoogleCredentials credentials = GoogleCredentials.fromStream(credentialsLocation.getInputStream());

        return StorageOptions.newBuilder()
                .setCredentials(credentials)
                .build()
                .getService();
    }
}