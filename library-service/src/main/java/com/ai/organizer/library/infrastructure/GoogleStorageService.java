package com.ai.organizer.library.infrastructure;

import com.ai.organizer.library.service.BlobStorageService; 
import com.google.cloud.storage.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Primary;
import org.springframework.stereotype.Service;

import java.net.URL;
import java.util.concurrent.TimeUnit;

@Service
@Primary
public class GoogleStorageService implements BlobStorageService {

    private final Storage storage;

    @Value("${gcp.storage.bucket-name}")
    private String bucketName;

    public GoogleStorageService(Storage storage) {
        this.storage = storage;
    }

    @Override
    public void upload(String filename, byte[] content, String contentType) {
        BlobId blobId = BlobId.of(bucketName, filename);
        BlobInfo blobInfo = BlobInfo.newBuilder(blobId)
                .setContentType(contentType)
                .build();
        
        storage.create(blobInfo, content);
        
    }

    @Override
    public byte[] download(String filename) {
        BlobId blobId = BlobId.of(bucketName, filename);
        Blob blob = storage.get(blobId);
        
        if (blob == null) {
            throw new RuntimeException("Arquivo não encontrado no GCS: " + filename);
        }
        
        return blob.getContent();
    }

    @Override
    public URL getSignedUrl(String filename, int minutesToExpire) {
        
        if (filename == null || filename.isEmpty()) {
            throw new IllegalArgumentException("O nome do arquivo não pode ser nulo para gerar URL assinada.");
        }

        BlobId blobId = BlobId.of(bucketName, filename);
        BlobInfo blobInfo = BlobInfo.newBuilder(blobId).build();
        
        
        return storage.signUrl(
                blobInfo, 
                minutesToExpire, 
                TimeUnit.MINUTES, 
                Storage.SignUrlOption.withV4Signature()
        );
    }
}