package com.lifetrack;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.security.servlet.UserDetailsServiceAutoConfiguration;
import org.springframework.scheduling.annotation.EnableScheduling;

// Users sign in with our own JWT flow, so Spring's default in-memory user is turned off
@EnableScheduling
@SpringBootApplication(exclude = UserDetailsServiceAutoConfiguration.class)
public class LifeTrackApplication {

    public static void main(String[] args) {
        SpringApplication.run(LifeTrackApplication.class, args);
    }
}
