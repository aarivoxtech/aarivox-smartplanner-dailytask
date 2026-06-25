package com.aarivox.smartplanner.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.time.LocalDateTime;

@Entity
@Table(name = "users")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class User {
    
    @Id
    @Column(length = 100)
    private String id; // Firebase UID or local ID
    
    @Column(name = "full_name", nullable = false, length = 100)
    private String fullName;
    
    @Column(nullable = false, unique = true, length = 100)
    private String email;
    
    @Column(name = "mobile_number", length = 20)
    private String mobileNumber;
    
    @Column(length = 20)
    @Builder.Default
    private String role = "USER";
    
    @Column(name = "fcm_token")
    private String fcmToken;

    @Column(name = "password_hash", length = 100)
    private String passwordHash;
    
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;
    
    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
    }
}
