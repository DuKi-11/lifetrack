package com.lifetrack.auth;

import com.lifetrack.user.User;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.time.Instant;

public final class AuthDtos {

    private AuthDtos() {
    }

    public record SignUpRequest(
            @NotBlank(message = "Please enter your name")
            @Size(max = 80, message = "Name is too long")
            String name,

            @NotBlank(message = "Please enter your email")
            @Email(message = "Please enter a valid email")
            String email,

            @NotBlank(message = "Please enter a password")
            @Size(min = 8, max = 72, message = "Password must be 8 to 72 characters")
            String password) {
    }

    public record SignInRequest(
            @NotBlank(message = "Please enter your email")
            @Email(message = "Please enter a valid email")
            String email,

            @NotBlank(message = "Please enter your password")
            String password) {
    }

    /** Every field is optional: null leaves it unchanged. avatar "" removes the picture. currentPassword is needed only to change the email. */
    public record UpdateProfileRequest(
            @Size(min = 1, max = 80, message = "Name must be 1 to 80 characters")
            String name,

            @Email(message = "Please enter a valid email")
            @Size(min = 1, max = 160, message = "Email must be 1 to 160 characters")
            String email,

            @Size(max = 300_000, message = "Picture is too large")
            String avatar,

            String currentPassword) {
    }

    public record ChangePasswordRequest(
            @NotBlank(message = "Please enter your current password")
            String currentPassword,

            @NotBlank(message = "Please enter a new password")
            @Size(min = 8, max = 72, message = "Password must be 8 to 72 characters")
            String newPassword) {
    }

    public record UserDto(Long id, String name, String email, String avatar, Instant createdAt,
                          String equippedTheme, String equippedCrown) {
        public static UserDto from(User u) {
            return new UserDto(u.getId(), u.getName(), u.getEmail(), u.getAvatar(), u.getCreatedAt(),
                    u.getEquippedTheme(), u.getEquippedCrown());
        }
    }

    public record AuthResponse(String token, UserDto user) {
    }
}
