package com.culturalatlas.auth.dto;

import jakarta.validation.constraints.NotBlank;

public record LoginRequest(
        @NotBlank(message = "username là bắt buộc") String username,
        @NotBlank(message = "password là bắt buộc") String password) {
}
