package com.culturalatlas.admin;

import com.culturalatlas.user.User;

import java.time.LocalDateTime;
import java.util.List;

public final class AdminUserDtos {
    private AdminUserDtos() {}

    public record AdminUser(Long id, String username, String email, String fullName, String role,
                            boolean emailVerified, boolean googleLinked, String avatarUrl,
                            LocalDateTime createdAt, LocalDateTime deletedAt) {
        static AdminUser of(User u) {
            return new AdminUser(u.getId(), u.getUsername(), u.getEmail(), u.getFullName(), u.getRole().name(),
                    u.isEmailVerified(), u.isGoogleLinked(), u.getAvatarUrl(), u.getCreatedAt(), u.getDeletedAt());
        }
    }

    public record UserPage(List<AdminUser> items, int page, int size, long total, int totalPages) {}

    public record RoleStats(long total, long active, long deleted, long googleLinked,
                            long emailVerified, long newLast7Days) {
        static final RoleStats EMPTY = new RoleStats(0, 0, 0, 0, 0, 0);

        RoleStats plus(RoleStats o) {
            return new RoleStats(total + o.total, active + o.active, deleted + o.deleted,
                    googleLinked + o.googleLinked, emailVerified + o.emailVerified, newLast7Days + o.newLast7Days);
        }
    }

    public record DailyCount(java.time.LocalDate date, long count) {}

    /** ROLE_ADMIN vs everyone else (ROLE_USER, ROLE_RESEARCHER), plus sign-ups per day for the last 7 days. */
    public record Stats(RoleStats admin, RoleStats user, RoleStats all, List<DailyCount> signups) {}
}
