package com.culturalatlas.auth.controller;

import com.culturalatlas.auth.dto.ChangePasswordRequest;
import com.culturalatlas.auth.dto.ForgotPasswordRequest;
import com.culturalatlas.auth.dto.GoogleLoginRequest;
import com.culturalatlas.auth.dto.LoginRequest;
import com.culturalatlas.auth.dto.LoginResponse;
import com.culturalatlas.auth.dto.LogoutRequest;
import com.culturalatlas.auth.dto.MeResponse;
import com.culturalatlas.auth.dto.RefreshRequest;
import com.culturalatlas.auth.dto.RefreshResponse;
import com.culturalatlas.auth.dto.RegisterRequest;
import com.culturalatlas.auth.dto.RegisterResponse;
import com.culturalatlas.auth.dto.ResendVerificationRequest;
import com.culturalatlas.auth.dto.ResetPasswordRequest;
import com.culturalatlas.auth.dto.UpdateProfileRequest;
import com.culturalatlas.auth.dto.VerifyEmailRequest;
import com.culturalatlas.auth.service.AuthService;
import com.culturalatlas.common.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/** Endpoints ported from the DIMS AuthController, under /api/v1/auth and wrapped in ApiResponse. */
@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
@Tag(name = "Auth", description = "Register, login (password or Google), logout, profile, email verification, password reset")
public class AuthController {
    private static final String BEARER_PREFIX = "Bearer ";

    private final AuthService authService;

    @PostMapping("/register")
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Create a ROLE_USER account and email a verification code")
    public ApiResponse<RegisterResponse> register(@Valid @RequestBody RegisterRequest request) {
        return ApiResponse.success("Đăng ký thành công, hãy kiểm tra email để xác minh", authService.register(request));
    }

    @PostMapping("/login")
    @Operation(summary = "Login with username and password")
    public ApiResponse<LoginResponse> login(@Valid @RequestBody LoginRequest request) {
        return ApiResponse.success("Đăng nhập thành công", authService.login(request));
    }

    @PostMapping("/google")
    @Operation(summary = "Login with a Google ID token; the first login creates a ROLE_USER account")
    public ApiResponse<LoginResponse> google(@Valid @RequestBody GoogleLoginRequest request) {
        return ApiResponse.success("Đăng nhập Google thành công", authService.googleLogin(request.googleIdToken()));
    }

    @PostMapping("/refresh")
    @Operation(summary = "Exchange a refresh token for a new access token")
    public ApiResponse<RefreshResponse> refresh(@Valid @RequestBody RefreshRequest request) {
        return ApiResponse.success(authService.refresh(request.refreshToken()));
    }

    @PostMapping("/logout")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(summary = "Revoke the current access token and, if given, the refresh token")
    public void logout(@RequestHeader("Authorization") String authorization,
                       @RequestBody(required = false) LogoutRequest request) {
        String accessToken = authorization.startsWith(BEARER_PREFIX)
                ? authorization.substring(BEARER_PREFIX.length()) : null;
        authService.logout(accessToken, request == null ? null : request.refreshToken());
    }

    @GetMapping("/me")
    @Operation(summary = "Current user profile")
    public ApiResponse<MeResponse> me(@AuthenticationPrincipal String username) {
        return ApiResponse.success(authService.me(username));
    }

    @PutMapping("/me")
    @Operation(summary = "Update the current user's profile")
    public ApiResponse<MeResponse> updateProfile(@AuthenticationPrincipal String username,
                                                 @Valid @RequestBody UpdateProfileRequest request) {
        return ApiResponse.success("Đã cập nhật hồ sơ", authService.updateProfile(username, request));
    }

    @PostMapping("/change-password")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(summary = "Change password (requires the current password)")
    public void changePassword(@AuthenticationPrincipal String username,
                               @Valid @RequestBody ChangePasswordRequest request) {
        authService.changePassword(username, request);
    }

    @PostMapping("/verify-email/request")
    @ResponseStatus(HttpStatus.ACCEPTED)
    @Operation(summary = "Send a new email verification code (always 202)")
    public void requestEmailVerification(@Valid @RequestBody ResendVerificationRequest request) {
        authService.resendEmailVerification(request.email());
    }

    @PostMapping("/verify-email/confirm")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(summary = "Confirm the email with the 6-digit code")
    public void confirmEmailVerification(@Valid @RequestBody VerifyEmailRequest request) {
        authService.confirmEmail(request.email(), request.code());
    }

    @PostMapping("/forgot-password")
    @ResponseStatus(HttpStatus.ACCEPTED)
    @Operation(summary = "Email a password reset code (always 202, whether or not the email exists)")
    public void forgotPassword(@Valid @RequestBody ForgotPasswordRequest request) {
        authService.forgotPassword(request.email());
    }

    @PostMapping("/reset-password")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(summary = "Set a new password with the reset code")
    public void resetPassword(@Valid @RequestBody ResetPasswordRequest request) {
        authService.resetPassword(request);
    }
}