package com.culturalatlas.auth.filter;

import com.culturalatlas.auth.service.JwtService;
import com.culturalatlas.auth.service.TokenBlacklistService;
import io.jsonwebtoken.Claims;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.lang.NonNull;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;

/**
 * Reads "Authorization: Bearer <access token>". A valid, non-revoked access token authenticates the
 * request with the role stored in it. Anything else is ignored: the request continues as anonymous and
 * SecurityConfig decides between 401 and 403.
 */
@Component
@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private static final String BEARER_PREFIX = "Bearer ";

    private final JwtService jwtService;
    private final TokenBlacklistService tokenBlacklistService;

    @Override
    protected void doFilterInternal(@NonNull HttpServletRequest request,
                                    @NonNull HttpServletResponse response,
                                    @NonNull FilterChain filterChain) throws ServletException, IOException {
        String header = request.getHeader("Authorization");
        if (header != null && header.startsWith(BEARER_PREFIX)
                && SecurityContextHolder.getContext().getAuthentication() == null) {
            jwtService.parse(header.substring(BEARER_PREFIX.length()))
                    .filter(claims -> JwtService.TYPE_ACCESS.equals(claims.get("type", String.class)))
                    .filter(claims -> !tokenBlacklistService.isBlacklisted(claims.getId()))
                    .ifPresent(this::authenticate);
        }
        filterChain.doFilter(request, response);
    }

    private void authenticate(Claims claims) {
        String role = claims.get("role", String.class);
        // VICA roles already carry the prefix (ROLE_ADMIN), so they are used as-is. Adding "ROLE_" again
        // would produce ROLE_ROLE_ADMIN and silently break hasRole("ADMIN").
        List<GrantedAuthority> authorities = StringUtils.hasText(role)
                ? List.of(new SimpleGrantedAuthority(role))
                : List.of();
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(claims.getSubject(), null, authorities));
    }
}