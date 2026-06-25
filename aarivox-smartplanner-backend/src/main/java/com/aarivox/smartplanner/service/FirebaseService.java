package com.aarivox.smartplanner.service;

import com.google.auth.oauth2.GoogleCredentials;
import com.google.firebase.FirebaseApp;
import com.google.firebase.FirebaseOptions;
import com.google.firebase.messaging.FirebaseMessaging;
import com.google.firebase.messaging.Message;
import com.google.firebase.messaging.Notification;
import jakarta.annotation.PostConstruct;
import lombok.AllArgsConstructor;
import lombok.Getter;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.ResourceLoader;
import org.springframework.stereotype.Service;
import java.io.InputStream;

@Service
public class FirebaseService {

    @Value("${app.firebase.config-path}")
    private String configPath;

    private final ResourceLoader resourceLoader;

    public FirebaseService(ResourceLoader resourceLoader) {
        this.resourceLoader = resourceLoader;
    }

    @PostConstruct
    public void initialize() {
        try {
            if (FirebaseApp.getApps().isEmpty()) {
                Resource resource = resourceLoader.getResource(configPath);
                InputStream serviceAccount = resource.getInputStream();

                FirebaseOptions options = FirebaseOptions.builder()
                        .setCredentials(GoogleCredentials.fromStream(serviceAccount))
                        .build();

                FirebaseApp.initializeApp(options);
                System.out.println("Firebase SDK initialized successfully.");
            }
        } catch (Exception e) {
            System.err.println("WARNING: Firebase SDK could not be initialized using " + configPath + 
                               ". Push notifications and real Firebase Auth verification will not work unless configured. " +
                               "Error: " + e.getMessage());
        }
    }

    @Getter
    @AllArgsConstructor
    public static class VerifiedUser {
        private final String uid;
        private final String email;
        private final String name;
    }

    public VerifiedUser verifyIdToken(String idToken) throws Exception {
        // Development local bypass
        if (idToken != null && idToken.startsWith("mock-token-")) {
            String email = idToken.substring("mock-token-".length());
            String name = email.split("@")[0];
            String uid = "mock-uid-" + name;
            return new VerifiedUser(uid, email, name);
        }

        if (FirebaseApp.getApps().isEmpty()) {
            throw new IllegalStateException("Firebase is not initialized. Provide firebase-service-account.json or use a 'mock-token-[email]' for testing.");
        }

        com.google.firebase.auth.FirebaseToken decodedToken = com.google.firebase.auth.FirebaseAuth.getInstance().verifyIdToken(idToken);
        String name = decodedToken.getName();
        if (name == null || name.isEmpty()) {
            name = decodedToken.getEmail() != null ? decodedToken.getEmail().split("@")[0] : "User";
        }
        return new VerifiedUser(decodedToken.getUid(), decodedToken.getEmail(), name);
    }

    public void sendPushNotification(String fcmToken, String title, String body) {
        if (FirebaseApp.getApps().isEmpty()) {
            System.out.println("[MOCK PUSH] Firebase not active. Simulating push to token: " + fcmToken + " - Title: " + title + " - Body: " + body);
            return;
        }

        try {
            Message message = Message.builder()
                    .setToken(fcmToken)
                    .setNotification(Notification.builder()
                            .setTitle(title)
                            .setBody(body)
                            .build())
                    .build();

            String response = FirebaseMessaging.getInstance().send(message);
            System.out.println("Successfully sent message: " + response);
        } catch (Exception e) {
            System.err.println("Error sending push notification to " + fcmToken + ": " + e.getMessage());
        }
    }
}
