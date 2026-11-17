package com.culturalatlas.auth;

import com.culturalatlas.user.Role;
import com.culturalatlas.user.User;
import com.culturalatlas.user.UserRepository;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

/**
 * Dev profile only: creates one ADMIN and one RESEARCHER account so the admin API can be tried locally.
 * Passwords come from environment variables and are never stored in the repository; an account whose
 * password variable is unset is skipped. Existing accounts are left untouched.
 */
@Component
@Profile("dev")
@RequiredArgsConstructor
public class DevUserSeeder implements ApplicationRunner {
    private static final Logger LOG = LoggerFactory.getLogger(DevUserSeeder.class);

    private final UserRepository users;
    private final PasswordEncoder passwordEncoder;

    @Value("${app.dev-users.admin-password:}")
    private String adminPassword;

    @Value("${app.dev-users.researcher-password:}")
    private String researcherPassword;

    @Override
    public void run(ApplicationArguments args) {
        seed("admin", "admin@vica.local", "VICA Admin", Role.ROLE_ADMIN, adminPassword, "DEV_ADMIN_PASSWORD");
        seed("researcher", "researcher@vica.local", "VICA Researcher", Role.ROLE_RESEARCHER,
                researcherPassword, "DEV_RESEARCHER_PASSWORD");
    }

    private void seed(String username, String email, String fullName, Role role, String password, String envName) {
        if (users.existsByUsername(username)) {
            return;
        }
        if (password == null || password.isBlank()) {
            LOG.info("Dev account '{}' not created: set {} to create it", username, envName);
            return;
        }
        users.save(User.builder().username(username).email(email).fullName(fullName).role(role)
                                .password(passwordEncoder.encode(password)).enabled(true).emailVerified(true).build());
        LOG.info("Dev account '{}' created with role {}", username, role);
    }
}