package com.lifetrack.auth;

import com.lifetrack.auth.AuthDtos.AuthResponse;
import com.lifetrack.auth.AuthDtos.SignInRequest;
import com.lifetrack.auth.AuthDtos.SignUpRequest;
import com.lifetrack.auth.AuthDtos.ChangePasswordRequest;
import com.lifetrack.auth.AuthDtos.UpdateProfileRequest;
import com.lifetrack.auth.AuthDtos.UserDto;
import com.lifetrack.common.ApiException;
import com.lifetrack.config.JwtService;
import com.lifetrack.user.User;
import com.lifetrack.user.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Locale;

@Service
public class AuthService {

    private final UserRepository users;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    public AuthService(UserRepository users, PasswordEncoder passwordEncoder, JwtService jwtService) {
        this.users = users;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
    }

    @Transactional
    public AuthResponse signUp(SignUpRequest req) {
        String email = req.email().trim().toLowerCase(Locale.ROOT);
        if (users.existsByEmailIgnoreCase(email)) {
            throw new ApiException(HttpStatus.CONFLICT, "An account with this email already exists");
        }
        User user = users.save(new User(req.name().trim(), email, passwordEncoder.encode(req.password())));
        return new AuthResponse(jwtService.createToken(user.getId()), UserDto.from(user));
    }

    @Transactional(readOnly = true)
    public AuthResponse signIn(SignInRequest req) {
        User user = users.findByEmailIgnoreCase(req.email().trim())
                .filter(u -> passwordEncoder.matches(req.password(), u.getPasswordHash()))
                // Same message for unknown email and wrong password, so emails can't be probed
                .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "Email or password is incorrect"));
        return new AuthResponse(jwtService.createToken(user.getId()), UserDto.from(user));
    }

    @Transactional(readOnly = true)
    public UserDto me(Long userId) {
        return users.findById(userId).map(UserDto::from)
                .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "Please sign in"));
    }

    @Transactional
    public UserDto updateProfile(Long userId, UpdateProfileRequest req) {
        User user = users.findById(userId)
                .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "Please sign in"));

        String email = req.email() == null ? user.getEmail() : req.email().trim().toLowerCase(Locale.ROOT);
        if (!email.equalsIgnoreCase(user.getEmail())) {
            // The email is the sign-in name, so changing it needs the password
            if (req.currentPassword() == null || !passwordEncoder.matches(req.currentPassword(), user.getPasswordHash())) {
                throw new ApiException(HttpStatus.FORBIDDEN, "Enter your current password to change your email");
            }
            if (users.existsByEmailIgnoreCase(email)) {
                throw new ApiException(HttpStatus.CONFLICT, "An account with this email already exists");
            }
            user.setEmail(email);
        }
        if (req.name() != null) {
            if (req.name().isBlank()) throw new ApiException(HttpStatus.BAD_REQUEST, "Please enter your name");
            user.setName(req.name().trim());
        }

        if (req.avatar() != null) {
            String avatar = req.avatar();
            if (avatar.isEmpty()) {
                user.setAvatar(null);
            } else if (avatar.matches("^data:image/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$")) {
                user.setAvatar(avatar);
            } else {
                throw new ApiException(HttpStatus.BAD_REQUEST, "Please choose a PNG, JPEG or WebP image");
            }
        }
        return UserDto.from(user);
    }

    @Transactional
    public void changePassword(Long userId, ChangePasswordRequest req) {
        User user = users.findById(userId)
                .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "Please sign in"));
        if (!passwordEncoder.matches(req.currentPassword(), user.getPasswordHash())) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Current password is incorrect");
        }
        user.setPasswordHash(passwordEncoder.encode(req.newPassword()));
    }
}
