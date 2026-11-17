package com.culturalatlas.auth.service;

import java.util.concurrent.TimeUnit;

import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class TokenBlacklistService {

    private static final String PREFIX = "auth:blacklist:";

    private final StringRedisTemplate redisTemplate;

    /** Revoke a token by its jti until it would have expired anyway. */
    public void blacklist(String jti, long ttlMillis) {
        if (jti == null || ttlMillis <= 0) {
            return;
        }
        redisTemplate.opsForValue().set(PREFIX + jti, "1", ttlMillis, TimeUnit.MILLISECONDS);
    }

    public boolean isBlacklisted(String jti) {
        if (jti == null) {
            return false;
        }
        return Boolean.TRUE.equals(redisTemplate.hasKey(PREFIX + jti));
    }
}