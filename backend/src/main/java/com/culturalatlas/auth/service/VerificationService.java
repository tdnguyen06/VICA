package com.culturalatlas.auth.service;

import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import java.security.SecureRandom;
import java.util.Locale;
import java.util.concurrent.TimeUnit;

/** One-time 6-digit codes kept in Redis (email verification, password reset). A new code replaces the old one. */
@Service
@RequiredArgsConstructor
public class VerificationService {
    public static final String PURPOSE_EMAIL_VERIFY = "emailverify";
    public static final String PURPOSE_PASSWORD_RESET = "pwreset";

    private static final String PREFIX = "auth:otp:";
    private static final SecureRandom RANDOM = new SecureRandom();

    private final StringRedisTemplate redisTemplate;

    @Value("${app.verification.ttl-minutes:10}")
    private long ttlMinutes;

    public String issueCode(String purpose, String email) {
        String code = String.format("%06d", RANDOM.nextInt(1_000_000));
        redisTemplate.opsForValue().set(key(purpose, email), code, ttlMinutes, TimeUnit.MINUTES);
        return code;
    }

    /** True once for the right code; the code is deleted so it cannot be reused. */
    public boolean verifyCode(String purpose, String email, String code) {
        String key = key(purpose, email);
        String stored = redisTemplate.opsForValue().get(key);
        if (stored != null && stored.equals(code)) {
            redisTemplate.delete(key);
            return true;
        }
        return false;
    }

    private String key(String purpose, String email) {
        return PREFIX + purpose + ":" + email.toLowerCase(Locale.ROOT);
    }
}