package com.aarivox.smartplanner.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AuthRequest {
    private String idToken;
    private String fullName; // Fallback / customization if needed
    private String mobileNumber;
    private String password; // Plaintext password for backend validation
}
