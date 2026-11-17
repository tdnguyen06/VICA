package com.culturalatlas.auth.service;

/** Verifies a Google ID token. An interface so AuthService can be tested without calling Google. */
public interface GoogleIdentityVerifier {

    /** @throws com.culturalatlas.auth.AuthException if the token is invalid or Google login is not configured */
    GoogleIdentity verify(String idToken);

    record GoogleIdentity(String email, String name, boolean emailVerified, String picture) {
    }
}