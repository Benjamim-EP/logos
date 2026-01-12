package com.ai.organizer.processor.service;

import java.net.URL;

public interface BlobStorageService {
    void upload(String filename, byte[] content, String contentType);
    
    byte[] download(String filename);
    
    URL getSignedUrl(String filename, int minutesToExpire);
}