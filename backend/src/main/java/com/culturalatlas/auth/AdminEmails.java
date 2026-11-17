package com.culturalatlas.auth;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.util.Arrays;
import java.util.Locale;
import java.util.Set;
import java.util.stream.Collectors;

/** Emails listed in app.admin-emails (ADMIN_EMAILS, comma separated) are promoted to ROLE_ADMIN on login. */
@Component
public class AdminEmails {

    private final Set<String> emails;

    public AdminEmails(@Value("${app.admin-emails:}") String raw) {
        this.emails = Arrays.stream(raw.split(","))
                .map(s -> s.trim().toLowerCase(Locale.ROOT))
                .filter(s -> !s.isEmpty())
                .collect(Collectors.toUnmodifiableSet());
    }

    public boolean contains(String email) {
        return email != null && emails.contains(email.toLowerCase(Locale.ROOT));
    }
}
