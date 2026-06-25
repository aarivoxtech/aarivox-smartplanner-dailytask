package com.aarivox.smartplanner.controller;

import com.aarivox.smartplanner.dto.AuthRequest;
import com.aarivox.smartplanner.dto.AuthResponse;
import com.aarivox.smartplanner.model.User;
import com.aarivox.smartplanner.repository.UserRepository;
import com.aarivox.smartplanner.security.JwtTokenProvider;
import com.aarivox.smartplanner.security.UserPrincipal;
import com.aarivox.smartplanner.service.FirebaseService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import java.util.Optional;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    @Autowired
    private FirebaseService firebaseService;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private JwtTokenProvider jwtTokenProvider;

    /**
     * Helper to compute SHA-256 hash of plaintext passwords
     */
    private String hashPassword(String password) {
        if (password == null) return null;
        try {
            java.security.MessageDigest digest = java.security.MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(password.getBytes(java.nio.charset.StandardCharsets.UTF_8));
            StringBuilder hexString = new StringBuilder();
            for (byte b : hash) {
                String hex = Integer.toHexString(0xff & b);
                if (hex.length() == 1) hexString.append('0');
                hexString.append(hex);
            }
            return hexString.toString();
        } catch (Exception ex) {
            throw new RuntimeException("Hashing failed: " + ex.getMessage());
        }
    }

    @PostMapping("/login")
    public ResponseEntity<?> loginUser(@RequestBody AuthRequest authRequest) {
        try {
            FirebaseService.VerifiedUser verifiedUser = firebaseService.verifyIdToken(authRequest.getIdToken());
            
            // Look up existing user by UID in PostgreSQL database
            Optional<User> userOptional = userRepository.findById(verifiedUser.getUid());
            
            String inputPassword = authRequest.getPassword();
            String inputHash = hashPassword(inputPassword);
            
            if (userOptional.isPresent()) {
                User user = userOptional.get();
                
                // If it is bypass mode (mock token check), verify the password hash in the database
                if (authRequest.getIdToken() != null && authRequest.getIdToken().startsWith("mock-token-")) {
                    if (user.getPasswordHash() != null && !user.getPasswordHash().equals(inputHash)) {
                        return ResponseEntity.status(401).body("Invalid email or password.");
                    }
                }
                
                String jwt = jwtTokenProvider.generateToken(user.getId(), user.getEmail(), user.getRole());
                return ResponseEntity.ok(new AuthResponse(jwt, user));
            } else {
                // If it is the default bypass demo user, we automatically seed/register it
                if ("demo@aarivox.com".equals(verifiedUser.getEmail())) {
                    String demoHash = hashPassword("password123");
                    User user = User.builder()
                            .id(verifiedUser.getUid())
                            .email(verifiedUser.getEmail())
                            .fullName("Demo User")
                            .passwordHash(demoHash)
                            .role("USER")
                            .build();
                    user = userRepository.save(user);
                    
                    String jwt = jwtTokenProvider.generateToken(user.getId(), user.getEmail(), user.getRole());
                    return ResponseEntity.ok(new AuthResponse(jwt, user));
                }
                
                // If user doesn't exist in the database, reject login
                return ResponseEntity.status(401).body("User account not found. Please create an account first.");
            }
            
        } catch (Exception e) {
            return ResponseEntity.status(401).body("Authentication failed: " + e.getMessage());
        }
    }

    @PostMapping("/register")
    public ResponseEntity<?> registerUser(@RequestBody AuthRequest authRequest) {
        try {
            FirebaseService.VerifiedUser verifiedUser = firebaseService.verifyIdToken(authRequest.getIdToken());
            
            Optional<User> userOptional = userRepository.findById(verifiedUser.getUid());
            User user;
            
            String passwordHash = hashPassword(authRequest.getPassword());
            
            if (userOptional.isPresent()) {
                user = userOptional.get();
                if (authRequest.getFullName() != null && !authRequest.getFullName().isEmpty()) {
                    user.setFullName(authRequest.getFullName());
                }
                if (authRequest.getMobileNumber() != null && !authRequest.getMobileNumber().isEmpty()) {
                    user.setMobileNumber(authRequest.getMobileNumber());
                }
                if (passwordHash != null) {
                    user.setPasswordHash(passwordHash);
                }
                user = userRepository.save(user);
            } else {
                user = User.builder()
                        .id(verifiedUser.getUid())
                        .email(verifiedUser.getEmail())
                        .fullName(authRequest.getFullName() != null && !authRequest.getFullName().isEmpty() 
                                ? authRequest.getFullName() : verifiedUser.getName())
                        .mobileNumber(authRequest.getMobileNumber())
                        .passwordHash(passwordHash)
                        .role("USER")
                        .build();
                user = userRepository.save(user);
            }
            
            String jwt = jwtTokenProvider.generateToken(user.getId(), user.getEmail(), user.getRole());
            return ResponseEntity.ok(new AuthResponse(jwt, user));
            
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Registration failed: " + e.getMessage());
        }
    }

    @PostMapping("/fcm-token")
    public ResponseEntity<?> updateFcmToken(@RequestParam String fcmToken, @AuthenticationPrincipal UserPrincipal currentUser) {
        if (currentUser == null) {
            return ResponseEntity.status(401).body("User not authenticated.");
        }
        
        Optional<User> userOptional = userRepository.findById(currentUser.getId());
        if (userOptional.isPresent()) {
            User user = userOptional.get();
            user.setFcmToken(fcmToken);
            userRepository.save(user);
            return ResponseEntity.ok("FCM token updated successfully.");
        }
        
        return ResponseEntity.notFound().build();
    }
    
    @GetMapping("/profile")
    public ResponseEntity<?> getUserProfile(@AuthenticationPrincipal UserPrincipal currentUser) {
        if (currentUser == null) {
            return ResponseEntity.status(401).body("User not authenticated.");
        }
        
        return userRepository.findById(currentUser.getId())
                .<ResponseEntity<?>>map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }
}
