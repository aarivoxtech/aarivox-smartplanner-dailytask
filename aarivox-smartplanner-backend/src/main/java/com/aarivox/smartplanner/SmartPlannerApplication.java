package com.aarivox.smartplanner;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.ResultSet;
import java.sql.Statement;

@SpringBootApplication
@EnableScheduling
public class SmartPlannerApplication {

    static {
        // Auto-create database if not exists before Spring Boot Datasource initialization
        String url = System.getenv("SPRING_DATASOURCE_URL");
        if (url == null) {
            url = "jdbc:postgresql://localhost:5432/aarivox";
        }
        
        String username = System.getenv("SPRING_DATASOURCE_USERNAME");
        if (username == null) {
            username = "postgres";
        }
        
        String password = System.getenv("SPRING_DATASOURCE_PASSWORD");
        if (password == null) {
            password = "root";
        }

        try {
            // Locate the last slash to separate host/port from database catalog name
            int lastSlashIndex = url.lastIndexOf("/");
            if (lastSlashIndex != -1) {
                String baseUrl = url.substring(0, lastSlashIndex);
                String dbName = url.substring(lastSlashIndex + 1);
                
                // Connect to default 'postgres' catalog (always exists in PostgreSQL installations)
                String adminUrl = baseUrl + "/postgres";
                
                try (Connection conn = DriverManager.getConnection(adminUrl, username, password);
                     Statement stmt = conn.createStatement()) {
                    
                    // Verify if database 'aarivox' already exists
                    ResultSet rs = stmt.executeQuery("SELECT 1 FROM pg_database WHERE datname = '" + dbName + "'");
                    if (!rs.next()) {
                        System.out.println("--- DatabaseAutoCreator: Catalog '" + dbName + "' does not exist. Creating it automatically... ---");
                        stmt.executeUpdate("CREATE DATABASE " + dbName);
                        System.out.println("--- DatabaseAutoCreator: Catalog '" + dbName + "' created successfully. ---");
                    } else {
                        System.out.println("--- DatabaseAutoCreator: Catalog '" + dbName + "' already exists. ---");
                    }
                }
            }
        } catch (Exception e) {
            System.err.println("--- DatabaseAutoCreator: Warning - Could not auto-create database. Details: " + e.getMessage() + " ---");
            System.err.println("--- Ensure PostgreSQL server is running and credentials match. Spring Boot will now attempt standard boot. ---");
        }
    }

    public static void main(String[] args) {
        SpringApplication.run(SmartPlannerApplication.class, args);
    }
}
