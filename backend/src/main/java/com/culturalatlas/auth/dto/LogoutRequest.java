package com.culturalatlas.auth.dto;

/** Optional body of logout: the refresh token is revoked together with the access token. */
public record LogoutRequest(String refreshToken) {
}