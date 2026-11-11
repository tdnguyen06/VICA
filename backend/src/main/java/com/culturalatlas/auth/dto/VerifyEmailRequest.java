package com.culturalatlas.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;

public record VerifyEmailRequest(
        @NotBlank(message = "email là bắt buộc") @Email(message = "email không hợp lệ") String email,
        @NotBlank(message = "code là bắt buộc") @Pattern(regexp = "^\\d{6}$", message = "mã gồm 6 chữ số") String code) {
}