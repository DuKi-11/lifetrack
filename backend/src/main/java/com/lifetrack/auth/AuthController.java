package com.lifetrack.auth;

import com.lifetrack.auth.AuthDtos.AuthResponse;
import com.lifetrack.auth.AuthDtos.ChangePasswordRequest;
import com.lifetrack.auth.AuthDtos.SignInRequest;
import com.lifetrack.auth.AuthDtos.SignUpRequest;
import com.lifetrack.auth.AuthDtos.UpdateProfileRequest;
import com.lifetrack.auth.AuthDtos.UserDto;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/signup")
    @ResponseStatus(HttpStatus.CREATED)
    public AuthResponse signUp(@Valid @RequestBody SignUpRequest request) {
        return authService.signUp(request);
    }

    @PostMapping("/signin")
    public AuthResponse signIn(@Valid @RequestBody SignInRequest request) {
        return authService.signIn(request);
    }

    @GetMapping("/me")
    public UserDto me(@AuthenticationPrincipal Long userId) {
        return authService.me(userId);
    }

    @PutMapping("/me")
    public UserDto updateMe(@AuthenticationPrincipal Long userId, @Valid @RequestBody UpdateProfileRequest request) {
        return authService.updateProfile(userId, request);
    }

    @PutMapping("/password")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void changePassword(@AuthenticationPrincipal Long userId, @Valid @RequestBody ChangePasswordRequest request) {
        authService.changePassword(userId, request);
    }
}
