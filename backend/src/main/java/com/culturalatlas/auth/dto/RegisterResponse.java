package com.culturalatlas.auth.dto;

import com.culturalatlas.user.User;

/** The new account. It is not logged in yet: the user verifies the email, then logs in. */
public record RegisterResponse(Long id, String username, String email, String fullName, String role,
                               boolean emailVerified) {

    public static RegisterResponse of(User user) {
        return new RegisterResponse(user.getId(), user.getUsername(), user.getEmail(), user.getFullName(),
                user.getRole().name(), user.isEmailVerified());
    }
}