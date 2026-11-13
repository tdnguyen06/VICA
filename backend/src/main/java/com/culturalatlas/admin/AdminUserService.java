package com.culturalatlas.admin;

import com.culturalatlas.admin.AdminUserDtos.AdminUser;
import com.culturalatlas.admin.AdminUserDtos.RoleStats;
import com.culturalatlas.admin.AdminUserDtos.Stats;
import com.culturalatlas.admin.AdminUserDtos.UserPage;
import com.culturalatlas.auth.AuthException;
import com.culturalatlas.user.Role;
import com.culturalatlas.user.User;
import com.culturalatlas.user.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class AdminUserService {

    private final UserRepository users;

    @Transactional(readOnly = true)
    public Stats stats() {
        RoleStats admin = RoleStats.EMPTY;
        RoleStats user = RoleStats.EMPTY;
        for (Object[] row : users.statsByRole(LocalDateTime.now().minusDays(7))) {
            RoleStats s = new RoleStats(num(row[1]), num(row[2]), num(row[3]), num(row[4]), num(row[5]), num(row[6]));
            if (row[0] == Role.ROLE_ADMIN) {
                admin = admin.plus(s);
            } else {
                user = user.plus(s);
            }
        }
        return new Stats(admin, user, admin.plus(user), signupsLast7Days());
    }

    private java.util.List<AdminUserDtos.DailyCount> signupsLast7Days() {
        java.time.LocalDate first = java.time.LocalDate.now().minusDays(6);
        java.util.Map<java.time.LocalDate, Long> perDay = new java.util.TreeMap<>();
        for (int i = 0; i < 7; i++) {
            perDay.put(first.plusDays(i), 0L);
        }
        for (LocalDateTime created : users.createdSince(first.atStartOfDay())) {
            perDay.merge(created.toLocalDate(), 1L, Long::sum);
        }
        return perDay.entrySet().stream()
                .map(e -> new AdminUserDtos.DailyCount(e.getKey(), e.getValue()))
                .toList();
    }

    private static long num(Object value) {
        return value == null ? 0 : ((Number) value).longValue();
    }

    @Transactional(readOnly = true)
    public UserPage list(String q, boolean includeDeleted, int page, int size) {
        Page<User> result = users.search(q == null ? "" : q.trim(), includeDeleted,
                PageRequest.of(Math.max(page, 0), Math.min(Math.max(size, 1), 100),
                        Sort.by(Sort.Direction.DESC, "id")));
        return new UserPage(result.map(AdminUser::of).getContent(), result.getNumber(), result.getSize(),
                result.getTotalElements(), result.getTotalPages());
    }

    /** Soft delete: the row stays, the account is disabled so neither password nor Google login works. */
    @Transactional
    public AdminUser softDelete(Long id, String currentUsername) {
        User user = find(id);
        if (user.getUsername().equals(currentUsername)) {
            throw new AuthException(HttpStatus.BAD_REQUEST, "Không thể tự xoá tài khoản của chính mình");
        }
        if (user.getDeletedAt() == null) {
            user.setDeletedAt(LocalDateTime.now());
            user.setEnabled(false);
        }
        return AdminUser.of(user);
    }

    @Transactional
    public AdminUser restore(Long id) {
        User user = find(id);
        user.setDeletedAt(null);
        user.setEnabled(true);
        return AdminUser.of(user);
    }

    private User find(Long id) {
        return users.findById(id)
                .orElseThrow(() -> new AuthException(HttpStatus.NOT_FOUND, "Không tìm thấy người dùng"));
    }
}
