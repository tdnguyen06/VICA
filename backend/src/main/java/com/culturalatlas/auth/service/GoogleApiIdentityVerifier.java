package com.culturalatlas.auth.service;

import com.culturalatlas.auth.AuthException;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdTokenVerifier;
import com.google.api.client.http.javanet.NetHttpTransport;
import com.google.api.client.json.gson.GsonFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.security.GeneralSecurityException;
import java.util.List;

/**
 * Checks with Google's public keys that an ID token is genuine, unexpired and issued for this app's
 * client id (GOOGLE_CLIENT_ID). Only the client id is needed: no client secret is used or stored.
 */
@Component
public class GoogleApiIdentityVerifier implements GoogleIdentityVerifier {

    private final GoogleIdTokenVerifier verifier;

    public GoogleApiIdentityVerifier(@Value("${app.google.client-id:}") String clientId) {
        this.verifier = clientId.isBlank() ? null
                : new GoogleIdTokenVerifier.Builder(new NetHttpTransport(), GsonFactory.getDefaultInstance())
                        .setAudience(List.of(clientId))
                        .build();
    }

    @Override
    public GoogleIdentity verify(String idToken) {
        if (verifier == null) {
            throw new AuthException(HttpStatus.SERVICE_UNAVAILABLE,
                    "Đăng nhập Google chưa được cấu hình (thiếu GOOGLE_CLIENT_ID)");
        }
        GoogleIdToken token;
        try {
            token = verifier.verify(idToken);
        } catch (GeneralSecurityException | IOException | IllegalArgumentException e) {
            throw new AuthException(HttpStatus.UNAUTHORIZED, "Không xác minh được Google token");
        }
        if (token == null) {
            throw new AuthException(HttpStatus.UNAUTHORIZED, "Google token không hợp lệ hoặc đã hết hạn");
        }
        GoogleIdToken.Payload payload = token.getPayload();
        return new GoogleIdentity(payload.getEmail(), (String) payload.get("name"),
                Boolean.TRUE.equals(payload.getEmailVerified()), (String) payload.get("picture"));
    }
}