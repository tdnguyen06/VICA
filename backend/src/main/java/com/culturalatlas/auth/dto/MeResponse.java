package com.culturalatlas.auth.dto;

import com.culturalatlas.user.User;

import java.time.LocalDate;

public record MeResponse(Long id, String username, String email, String fullName, String phone, String address,
                         String gender, LocalDate dateOfBirth, String role, boolean emailVerified,
                         String avatarUrl, boolean googleLinked) {

    public static MeResponse of(User user) {
        return new MeResponse(user.getId(), user.getUsername(), user.getEmail(), user.getFullName(), user.getPhone(),
                user.getAddress(), user.getGender(), user.getDateOfBirth(), user.getRole().name(),
                user.isEmailVerified(), user.getAvatarUrl(), user.isGoogleLinked());
    }
}