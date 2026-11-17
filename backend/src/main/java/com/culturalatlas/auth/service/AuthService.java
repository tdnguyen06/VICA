package com.culturalatlas.auth.service;

import com.culturalatlas.auth.AuthException;
import com.culturalatlas.auth.dto.ChangePasswordRequest;
import com.culturalatlas.auth.dto.LoginRequest;
import com.culturalatlas.auth.dto.LoginResponse;
import com.culturalatlas.auth.dto.MeResponse;
import com.culturalatlas.auth.dto.RefreshResponse;
import com.culturalatlas.auth.dto.RegisterRequest;
import com.culturalatlas.auth.dto.RegisterResponse;
import com.culturalatlas.auth.dto.ResetPasswordRequest;
import com.culturalatlas.auth.dto.UpdateProfileRequest;
import com.culturalatlas.auth.service.GoogleIdentityVerifier.GoogleIdentity;
import com.culturalatlas.user.Role;
import com.culturalatlas.user.User;
import com.culturalatlas.user.UserRepository;
import io.jsonwebtoken.Claims;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Locale;
import java.util.UUID;

/**
 * Account features ported from the DIMS auth module and adapted to VICA's users table:
 * register, login (password and Google), refresh, logout, profile, change password,
 * email verification and password reset.
 */
@Service
@RequiredArgsConstructor
public class AuthService {
    private static final String BAD_CREDENTIALS = "Sai tên đăng nhập hoặc mật khẩu";
    private static final String GOOGLE_ONLY = "Tài khoản này dùng Google. Hãy bấm \"Đăng nhập bằng Google\", hoặc dùng \"Quên mật khẩu\" để tạo mật khẩu.";    
    private static final String BAD_CODE = "Mã không hợp lệ hoặc đã hết hạn";

    private final UserRepository users;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final TokenBlacklistService blacklist;
    private final GoogleIdentityVerifier googleVerifier;
    private final VerificationService verificationService;
    private final EmailService emailService;
    private final com.culturalatlas.auth.AdminEmails adminEmails;

    // ---------- sign up / sign in ----------

    /** Self sign-up always creates ROLE_USER; ADMIN and RESEARCHER are never self-assigned. */
    @Transactional
    public RegisterResponse register(RegisterRequest request) {
        String username = request.username().trim();
        String email = normalizeEmail(request.email());
        String phone = blankToNull(request.phone());
        if (users.existsByUsername(username)) {
            throw new AuthException(HttpStatus.CONFLICT, "Tên đăng nhập đã tồn tại");
        }
        users.findByEmail(email).ifPresent(existing -> {
            throw new AuthException(HttpStatus.CONFLICT, existing.isGoogleLinked()
                    ? "Email này đã đăng nhập bằng Google. Hãy bấm \"Đăng nhập bằng Google\"."
                    : "Email đã được sử dụng");
        });
        if (phone != null && users.existsByPhone(phone)) {
            throw new AuthException(HttpStatus.CONFLICT, "Số điện thoại đã được sử dụng");
        }
        User user = users.save(User.builder()
                .username(username)
                .email(email)
                .password(passwordEncoder.encode(request.password()))
                .fullName(request.fullName().trim())
                .phone(phone)
                .address(blankToNull(request.address()))
                .gender(blankToNull(request.gender()))
                .dateOfBirth(request.dateOfBirth())
                .role(Role.ROLE_USER)
                .enabled(true)
                .emailVerified(false)
                .build());
        sendEmailVerificationCode(user.getEmail());
        return RegisterResponse.of(user);
    }

    @Transactional
    public LoginResponse login(LoginRequest request) {
        String id = request.username().trim();
        User user = users.findByUsername(id)
                .or(() -> users.findByEmail(normalizeEmail(id)))
                .orElseThrow(() -> new AuthException(HttpStatus.UNAUTHORIZED, BAD_CREDENTIALS));
        if (!user.isHasPassword()) {
            throw new AuthException(HttpStatus.UNAUTHORIZED, GOOGLE_ONLY);
        }
        if (!passwordEncoder.matches(request.password(), user.getPassword())) {
            throw new AuthException(HttpStatus.UNAUTHORIZED, BAD_CREDENTIALS);
        }
        return issueTokens(user);
    }

    /** First Google login creates a ROLE_USER account; an existing account with that email keeps its role. */
    @Transactional
    public LoginResponse googleLogin(String googleIdToken) {
        GoogleIdentity identity = googleVerifier.verify(googleIdToken);
        if (!identity.emailVerified() || identity.email() == null) {
            throw new AuthException(HttpStatus.UNAUTHORIZED, "Email Google chưa được xác minh");
        }
        String email = normalizeEmail(identity.email());
        User user = users.findByEmail(email).orElseGet(() -> users.save(newGoogleUser(email, identity.name())));
        if (user.getDeletedAt() != null) {
            throw new AuthException(HttpStatus.FORBIDDEN, "Tài khoản đã bị xoá");
        }
        user.setEmailVerified(true); // Google has verified this address
        user.setGoogleLinked(true);
        if (identity.picture() != null) {
            user.setAvatarUrl(identity.picture());
        }
        return issueTokens(user);
    }

    @Transactional(readOnly = true)
    public RefreshResponse refresh(String refreshToken) {
        Claims claims = jwtService.parse(refreshToken)
                .filter(c -> JwtService.TYPE_REFRESH.equals(c.get("type", String.class)))
                .filter(c -> !blacklist.isBlacklisted(c.getId()))
                .orElseThrow(() -> new AuthException(HttpStatus.UNAUTHORIZED, "Refresh token không hợp lệ"));
        User user = activeUser(claims.getSubject());
        return new RefreshResponse(jwtService.generateAccessToken(user.getUsername(), user.getRole().name()),
                jwtService.getAccessExpirationMs());
    }

    /** Revokes both tokens until they would have expired anyway. Unknown or invalid tokens are ignored. */
    public void logout(String accessToken, String refreshToken) {
        revoke(accessToken);
        revoke(refreshToken);
    }

    // ---------- profile ----------

    @Transactional(readOnly = true)
    public MeResponse me(String username) {
        return MeResponse.of(activeUser(username));
    }

    @Transactional
    public MeResponse updateProfile(String username, UpdateProfileRequest request) {
        User user = activeUser(username);
        String phone = blankToNull(request.phone());
        if (phone != null && !phone.equals(user.getPhone()) && users.existsByPhone(phone)) {
            throw new AuthException(HttpStatus.CONFLICT, "Số điện thoại đã được sử dụng");
        }
        user.setFullName(request.fullName().trim());
        user.setPhone(phone);
        user.setAddress(blankToNull(request.address()));
        user.setGender(blankToNull(request.gender()));
        user.setDateOfBirth(request.dateOfBirth());
        return MeResponse.of(users.save(user));
    }

    @Transactional
    public void changePassword(String username, ChangePasswordRequest request) {
        User user = activeUser(username);
        if (!passwordEncoder.matches(request.oldPassword(), user.getPassword())) {
            throw new AuthException(HttpStatus.BAD_REQUEST, "Mật khẩu hiện tại không đúng");
        }
        if (passwordEncoder.matches(request.newPassword(), user.getPassword())) {
            throw new AuthException(HttpStatus.BAD_REQUEST, "Mật khẩu mới phải khác mật khẩu hiện tại");
        }
        user.setPassword(passwordEncoder.encode(request.newPassword()));
        user.setHasPassword(true);
        users.save(user);
    }

    // ---------- email verification and password reset ----------

    /** Silent when the account is missing or already verified (does not reveal which emails exist). */
    @Transactional(readOnly = true)
    public void resendEmailVerification(String email) {
        users.findByEmail(normalizeEmail(email))
                .filter(user -> !user.isEmailVerified())
                .ifPresent(user -> sendEmailVerificationCode(user.getEmail()));
    }

    @Transactional
    public void confirmEmail(String email, String code) {
        User user = users.findByEmail(normalizeEmail(email))
                .orElseThrow(() -> new AuthException(HttpStatus.BAD_REQUEST, BAD_CODE));
        if (user.isEmailVerified()) {
            return;
        }
        if (!verificationService.verifyCode(VerificationService.PURPOSE_EMAIL_VERIFY, user.getEmail(), code)) {
            throw new AuthException(HttpStatus.BAD_REQUEST, BAD_CODE);
        }
        user.setEmailVerified(true);
        users.save(user);
    }

    /** Silent whether or not the email exists, to avoid account enumeration. */
    @Transactional(readOnly = true)
    public void forgotPassword(String email) {
        users.findByEmail(normalizeEmail(email)).ifPresent(user -> {
            String code = verificationService.issueCode(VerificationService.PURPOSE_PASSWORD_RESET, user.getEmail());
            emailService.send(user.getEmail(), "VICA - Đặt lại mật khẩu",
                    "Mã đặt lại mật khẩu của bạn là: " + code + " (có hiệu lực trong thời gian ngắn).");
        });
    }

    @Transactional
    public void resetPassword(ResetPasswordRequest request) {
        User user = users.findByEmail(normalizeEmail(request.email()))
                .orElseThrow(() -> new AuthException(HttpStatus.BAD_REQUEST, BAD_CODE));
        if (!verificationService.verifyCode(VerificationService.PURPOSE_PASSWORD_RESET, user.getEmail(),
                request.code())) {
            throw new AuthException(HttpStatus.BAD_REQUEST, BAD_CODE);
        }
        user.setPassword(passwordEncoder.encode(request.newPassword()));
        user.setHasPassword(true);
        users.save(user);
    }

    // ---------- helpers ----------

    private LoginResponse issueTokens(User user) {
        if (!user.isEnabled()) {
            throw new AuthException(HttpStatus.FORBIDDEN, "Tài khoản đã bị khóa");
        }
        if (adminEmails.contains(user.getEmail()) && user.getRole() != Role.ROLE_ADMIN) {
            user.setRole(Role.ROLE_ADMIN);
        }
        String access = jwtService.generateAccessToken(user.getUsername(), user.getRole().name());
        String refresh = jwtService.generateRefreshToken(user.getUsername());
        return LoginResponse.of(user, access, refresh, jwtService.getAccessExpirationMs());
    }

    private User activeUser(String username) {
        User user = users.findByUsername(username)
                .orElseThrow(() -> new AuthException(HttpStatus.UNAUTHORIZED, "Tài khoản không còn tồn tại"));
        if (!user.isEnabled()) {
            throw new AuthException(HttpStatus.FORBIDDEN, "Tài khoản đã bị khóa");
        }
        return user;
    }

    private void sendEmailVerificationCode(String email) {
        String code = verificationService.issueCode(VerificationService.PURPOSE_EMAIL_VERIFY, email);
        emailService.send(email, "VICA - Xác minh email",
                "Mã xác minh email của bạn là: " + code + " (có hiệu lực trong thời gian ngắn).");
    }

    private User newGoogleUser(String email, String name) {
        return User.builder()
                .username(uniqueUsername(email))
                .email(email)
                // users.password is NOT NULL; a random hash nobody knows keeps password login impossible.
                .password(passwordEncoder.encode(UUID.randomUUID().toString()))
                .fullName(name == null ? null : name.substring(0, Math.min(name.length(), 100)))
                .role(Role.ROLE_USER)
                .enabled(true)
                .emailVerified(true)
                .googleLinked(true)
                .hasPassword(false)
                .build();
    }

    /** khoi.le@gmail.com -> "khoi.le", then "khoi.le1", "khoi.le2"... (max 50 chars, column limit). */
    private String uniqueUsername(String email) {
        String base = email.substring(0, email.indexOf('@')).replaceAll("[^a-z0-9._-]", "");
        if (base.isEmpty()) {
            base = "user";
        }
        base = base.substring(0, Math.min(base.length(), 40));
        String candidate = base;
        for (int i = 1; users.existsByUsername(candidate); i++) {
            candidate = base + i;
        }
        return candidate;
    }

    private void revoke(String token) {
        jwtService.parse(token).ifPresent(claims ->
                blacklist.blacklist(claims.getId(), claims.getExpiration().getTime() - System.currentTimeMillis()));
    }

    private static String normalizeEmail(String email) {
        return email.trim().toLowerCase(Locale.ROOT);
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}