package com.culturalatlas.user;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByUsername(String username);
    Optional<User> findByEmail(String email);
    boolean existsByUsername(String username);
    boolean existsByEmail(String email);
    boolean existsByPhone(String phone);

    @org.springframework.data.jpa.repository.Query("""
            SELECT u FROM User u
            WHERE (:includeDeleted = true OR u.deletedAt IS NULL)
              AND (:q = '' OR LOWER(u.email) LIKE LOWER(CONCAT('%', :q, '%'))
                   OR LOWER(u.username) LIKE LOWER(CONCAT('%', :q, '%'))
                   OR LOWER(COALESCE(u.fullName, '')) LIKE LOWER(CONCAT('%', :q, '%')))
            """)
    org.springframework.data.domain.Page<User> search(String q, boolean includeDeleted,
                                                      org.springframework.data.domain.Pageable pageable);

    /** One row per role: role, total, active, deleted, googleLinked, emailVerified, newSince (last three: active only). */
    @org.springframework.data.jpa.repository.Query("""
            SELECT u.role,
                   COUNT(u),
                   SUM(CASE WHEN u.deletedAt IS NULL THEN 1 ELSE 0 END),
                   SUM(CASE WHEN u.deletedAt IS NOT NULL THEN 1 ELSE 0 END),
                   SUM(CASE WHEN u.deletedAt IS NULL AND u.googleLinked = true THEN 1 ELSE 0 END),
                   SUM(CASE WHEN u.deletedAt IS NULL AND u.emailVerified = true THEN 1 ELSE 0 END),
                   SUM(CASE WHEN u.deletedAt IS NULL AND u.createdAt > :since THEN 1 ELSE 0 END)
            FROM User u GROUP BY u.role
            """)
    java.util.List<Object[]> statsByRole(java.time.LocalDateTime since);

    @org.springframework.data.jpa.repository.Query("SELECT u.createdAt FROM User u WHERE u.createdAt >= :since")
    java.util.List<java.time.LocalDateTime> createdSince(java.time.LocalDateTime since);
}

