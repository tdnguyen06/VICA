package com.culturalatlas.auth.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record ChangePasswordRequest(
        @NotBlank(message = "oldPassword là bắt buộc") String oldPassword,

        @NotBlank(message = "newPassword là bắt buộc")
        @Pattern(regexp = PasswordRules.STRONG_PASSWORD, message = PasswordRules.STRONG_PASSWORD_MESSAGE)
        String newPassword) {
}
