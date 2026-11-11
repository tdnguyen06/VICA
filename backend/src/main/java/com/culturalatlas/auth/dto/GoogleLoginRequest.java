package com.culturalatlas.auth.dto;

import jakarta.validation.constraints.NotBlank;

/** The ID token ("credential") that Google Identity Services gives the frontend. */
public record GoogleLoginRequest(@NotBlank(message = "googleIdToken là bắt buộc") String googleIdToken) {
}