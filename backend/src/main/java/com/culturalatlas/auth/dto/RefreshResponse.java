package com.culturalatlas.auth.dto;

public record RefreshResponse(String accessToken, long expiresInMs) {
}
