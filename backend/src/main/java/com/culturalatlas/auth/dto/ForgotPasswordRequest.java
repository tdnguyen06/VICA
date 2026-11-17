package com.culturalatlas.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public record ForgotPasswordRequest(
        @NotBlank(message = "email là bắt buộc") @Email(message = "email không hợp lệ") String email) {
}