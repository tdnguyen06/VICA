package com.culturalatlas.auth.dto;

import com.culturalatlas.user.User;

/** Returned by password and Google login. expiresInMs is the access-token lifetime. */
public record LoginResponse(String username, String email, String fullName, String role,
                            String accessToken, String refreshToken, long expiresInMs) {

    public static LoginResponse of(User user, String accessToken, String refreshToken, long expiresInMs) {
        return new LoginResponse(user.getUsername(), user.getEmail(), user.getFullName(), user.getRole().name(),
                accessToken, refreshToken, expiresInMs);
    }
}
