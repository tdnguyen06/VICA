package com.culturalatlas.auth;

import com.culturalatlas.auth.service.EmailService;
import com.culturalatlas.auth.service.GoogleIdentityVerifier;
import com.culturalatlas.auth.service.GoogleIdentityVerifier.GoogleIdentity;
import com.culturalatlas.auth.service.JwtService;
import com.culturalatlas.auth.service.TokenBlacklistService;
import com.culturalatlas.auth.service.VerificationService;
import com.culturalatlas.culture.dto.CultureDtos.EntryDetailDto;
import com.culturalatlas.culture.enums.EntryType;
import com.culturalatlas.culture.enums.VerificationStatus;
import com.culturalatlas.culture.service.CultureCommandService;
import com.culturalatlas.user.Role;
import com.culturalatlas.user.User;
import com.culturalatlas.user.UserRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.RequestBuilder;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** End-to-end through the real security filter chain and JWTs (H2 users table; Redis, mail and Google mocked). */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class AuthControllerTest {
    private static final String PASSWORD = "test-only-password";
    private static final String STRONG = "Str0ng!pass";

    @Autowired private MockMvc mvc;
    @Autowired private ObjectMapper json;
    @Autowired private UserRepository users;
    @Autowired private PasswordEncoder encoder;
    @Autowired private JwtService jwtService;

    @MockBean private TokenBlacklistService blacklist;
    @MockBean private GoogleIdentityVerifier google;
    @MockBean private VerificationService verification;
    @MockBean private EmailService email;
    @MockBean private CultureCommandService cultureCommands;

    @BeforeEach
    void setUp() {
        users.deleteAll();
        save("admin", "admin@test.local", Role.ROLE_ADMIN, true);
        save("viewer", "viewer@test.local", Role.ROLE_USER, true);
        save("locked", "locked@test.local", Role.ROLE_ADMIN, false);
        when(verification.issueCode(anyString(), anyString())).thenReturn("123456");
    }

    // ---------- login / tokens / logout ----------

    @Test
    void loginReturnsTokensWithRole() throws Exception {
        mvc.perform(login("admin", PASSWORD))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.role").value("ROLE_ADMIN"))
                .andExpect(jsonPath("$.data.accessToken").isNotEmpty())
                .andExpect(jsonPath("$.data.refreshToken").isNotEmpty());
    }

    @Test
    void wrongPasswordAndUnknownUserGiveTheSame401() throws Exception {
        mvc.perform(login("admin", "wrong")).andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value("Sai tên đăng nhập hoặc mật khẩu"));
        mvc.perform(login("nobody", PASSWORD)).andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value("Sai tên đăng nhập hoặc mật khẩu"));
    }

    @Test
    void disabledAccountIs403AndMissingFieldsAre400() throws Exception {
        mvc.perform(login("locked", PASSWORD)).andExpect(status().isForbidden());
        mvc.perform(postJson("/api/v1/auth/login", "{}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.details.length()").value(2));
    }

    @Test
    void meNeedsAValidAccessToken() throws Exception {
        mvc.perform(get("/api/v1/auth/me")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/v1/auth/me").header("Authorization", bearer("admin")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.username").value("admin"));
        mvc.perform(get("/api/v1/auth/me").header("Authorization", bearer("admin") + "x"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void realTokenAuthorisesTheCultureAdminApiByRole() throws Exception {
        when(cultureCommands.createEntry(any())).thenReturn(new EntryDetailDto(1L, "x", "ha-noi", EntryType.PLACE,
                null, "X", null, "d", VerificationStatus.VERIFIED, null, null, List.of(), List.of()));
        String body = """
                {"slug":"x","provinceSlug":"ha-noi","type":"PLACE","name":"X","description":"d",
                 "verificationStatus":"VERIFIED","latitude":21.0,"longitude":105.8,"sources":[{"sourceId":1}]}""";

        mvc.perform(postJson("/api/v1/admin/cultures/entries", body).header("Authorization", bearer("admin")))
                .andExpect(status().isCreated());
        mvc.perform(postJson("/api/v1/admin/cultures/entries", body).header("Authorization", bearer("viewer")))
                .andExpect(status().isForbidden());
        mvc.perform(postJson("/api/v1/admin/cultures/entries", body))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void refreshTokenCannotBeUsedAsAccessTokenButCanRefresh() throws Exception {
        String refresh = tokens("admin").get("refreshToken").asText();
        mvc.perform(get("/api/v1/auth/me").header("Authorization", "Bearer " + refresh))
                .andExpect(status().isUnauthorized());
        mvc.perform(postJson("/api/v1/auth/refresh", "{\"refreshToken\":\"" + refresh + "\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.accessToken").isNotEmpty());
    }

    @Test
    void logoutRevokesTokensAndRevokedTokensAreRejected() throws Exception {
        JsonNode t = tokens("admin");
        String access = t.get("accessToken").asText();
        mvc.perform(postJson("/api/v1/auth/logout", "{\"refreshToken\":\"" + t.get("refreshToken").asText() + "\"}")
                        .header("Authorization", "Bearer " + access))
                .andExpect(status().isNoContent());
        verify(blacklist, times(2)).blacklist(anyString(), anyLong());

        when(blacklist.isBlacklisted(anyString())).thenReturn(true);
        mvc.perform(get("/api/v1/auth/me").header("Authorization", "Bearer " + access))
                .andExpect(status().isUnauthorized());
    }

    // ---------- register ----------

    @Test
    void registerCreatesUnverifiedPlainUserAndSendsCode() throws Exception {
        mvc.perform(postJson("/api/v1/auth/register", registerBody("newbie", "New.Bie@Mail.com", STRONG, "0912345678")))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.role").value("ROLE_USER"))
                .andExpect(jsonPath("$.data.email").value("new.bie@mail.com"))
                .andExpect(jsonPath("$.data.emailVerified").value(false));
        verify(email).send(eq("new.bie@mail.com"), anyString(), contains("123456"));
        mvc.perform(login("newbie", STRONG)).andExpect(status().isOk());
    }

    @Test
    void registerRejectsDuplicatesWith409() throws Exception {
        mvc.perform(postJson("/api/v1/auth/register", registerBody("admin", "x@mail.com", STRONG, null)))
                .andExpect(status().isConflict()).andExpect(jsonPath("$.message").value("Tên đăng nhập đã tồn tại"));
        mvc.perform(postJson("/api/v1/auth/register", registerBody("other", "ADMIN@test.local", STRONG, null)))
                .andExpect(status().isConflict()).andExpect(jsonPath("$.message").value("Email đã được sử dụng"));
        mvc.perform(postJson("/api/v1/auth/register", registerBody("phone1", "p1@mail.com", STRONG, "0900000001")))
                .andExpect(status().isCreated());
        mvc.perform(postJson("/api/v1/auth/register", registerBody("phone2", "p2@mail.com", STRONG, "0900000001")))
                .andExpect(status().isConflict()).andExpect(jsonPath("$.message").value("Số điện thoại đã được sử dụng"));
    }

    @Test
    void registerValidatesPasswordStrengthAndFormats() throws Exception {
        mvc.perform(postJson("/api/v1/auth/register", registerBody("ab", "not-an-email", "weakpass", "12345")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.details.length()").value(4));
    }

    // ---------- profile ----------

    @Test
    void updateProfileChangesOwnDataOnly() throws Exception {
        String body = "{\"fullName\":\"Quản trị viên\",\"phone\":\"0987654321\",\"address\":\"Hà Nội\",\"gender\":\"OTHER\"}";
        mvc.perform(put("/api/v1/auth/me").contentType(MediaType.APPLICATION_JSON).content(body)
                        .header("Authorization", bearer("admin")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.fullName").value("Quản trị viên"))
                .andExpect(jsonPath("$.data.phone").value("0987654321"))
                .andExpect(jsonPath("$.data.role").value("ROLE_ADMIN"));
        mvc.perform(put("/api/v1/auth/me").contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isUnauthorized());
        mvc.perform(put("/api/v1/auth/me").contentType(MediaType.APPLICATION_JSON).content(body)
                        .header("Authorization", bearer("viewer")))
                .andExpect(status().isConflict());
    }

    @Test
    void changePasswordNeedsTheCurrentPassword() throws Exception {
        mvc.perform(postJson("/api/v1/auth/change-password", "{\"oldPassword\":\"wrong\",\"newPassword\":\"" + STRONG + "\"}")
                        .header("Authorization", bearer("admin")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Mật khẩu hiện tại không đúng"));
        mvc.perform(postJson("/api/v1/auth/change-password",
                        "{\"oldPassword\":\"" + PASSWORD + "\",\"newPassword\":\"" + STRONG + "\"}")
                        .header("Authorization", bearer("admin")))
                .andExpect(status().isNoContent());
        mvc.perform(login("admin", STRONG)).andExpect(status().isOk());
        mvc.perform(login("admin", PASSWORD)).andExpect(status().isUnauthorized());
    }

    // ---------- email verification ----------

    @Test
    void confirmEmailWithTheRightCode() throws Exception {
        when(verification.verifyCode(VerificationService.PURPOSE_EMAIL_VERIFY, "viewer@test.local", "654321"))
                .thenReturn(true);
        mvc.perform(postJson("/api/v1/auth/verify-email/confirm", "{\"email\":\"viewer@test.local\",\"code\":\"111111\"}"))
                .andExpect(status().isBadRequest());
        mvc.perform(postJson("/api/v1/auth/verify-email/confirm", "{\"email\":\"viewer@test.local\",\"code\":\"654321\"}"))
                .andExpect(status().isNoContent());
        assertThat(users.findByUsername("viewer").orElseThrow().isEmailVerified()).isTrue();
    }

    @Test
    void resendVerificationIsAlways202AndDoesNotRevealAccounts() throws Exception {
        mvc.perform(postJson("/api/v1/auth/verify-email/request", "{\"email\":\"viewer@test.local\"}"))
                .andExpect(status().isAccepted());
        mvc.perform(postJson("/api/v1/auth/verify-email/request", "{\"email\":\"ghost@test.local\"}"))
                .andExpect(status().isAccepted());
        verify(email, times(1)).send(anyString(), anyString(), anyString());
    }

    // ---------- password reset ----------

    @Test
    void forgotAndResetPassword() throws Exception {
        mvc.perform(postJson("/api/v1/auth/forgot-password", "{\"email\":\"ghost@test.local\"}"))
                .andExpect(status().isAccepted());
        verify(email, never()).send(anyString(), anyString(), anyString());
        mvc.perform(postJson("/api/v1/auth/forgot-password", "{\"email\":\"viewer@test.local\"}"))
                .andExpect(status().isAccepted());
        verify(email).send(eq("viewer@test.local"), anyString(), contains("123456"));

        when(verification.verifyCode(VerificationService.PURPOSE_PASSWORD_RESET, "viewer@test.local", "123456"))
                .thenReturn(true);
        mvc.perform(postJson("/api/v1/auth/reset-password",
                        "{\"email\":\"viewer@test.local\",\"code\":\"000000\",\"newPassword\":\"" + STRONG + "\"}"))
                .andExpect(status().isBadRequest());
        mvc.perform(postJson("/api/v1/auth/reset-password",
                        "{\"email\":\"viewer@test.local\",\"code\":\"123456\",\"newPassword\":\"" + STRONG + "\"}"))
                .andExpect(status().isNoContent());
        mvc.perform(login("viewer", STRONG)).andExpect(status().isOk());
    }

    // ---------- Google ----------

    @Test
    void firstGoogleLoginCreatesAVerifiedPlainUserThenReusesIt() throws Exception {
        when(google.verify("g-token")).thenReturn(new GoogleIdentity("New.Person@Gmail.com", "New Person", true));

        mvc.perform(googleLogin("g-token")).andExpect(status().isOk())
                .andExpect(jsonPath("$.data.role").value("ROLE_USER"))
                .andExpect(jsonPath("$.data.username").value("new.person"));
        mvc.perform(googleLogin("g-token")).andExpect(status().isOk());

        User created = users.findByEmail("new.person@gmail.com").orElseThrow();
        assertThat(created.getRole()).isEqualTo(Role.ROLE_USER);
        assertThat(created.isEmailVerified()).isTrue();
        assertThat(users.count()).isEqualTo(4);
    }

    @Test
    void googleLoginMatchesExistingAccountByEmailKeepingItsRole() throws Exception {
        when(google.verify("g-admin")).thenReturn(new GoogleIdentity("admin@test.local", "Admin", true));
        mvc.perform(googleLogin("g-admin")).andExpect(status().isOk())
                .andExpect(jsonPath("$.data.role").value("ROLE_ADMIN"))
                .andExpect(jsonPath("$.data.username").value("admin"));
    }

    @Test
    void googleRejectsUnverifiedEmailAndReportsMissingConfiguration() throws Exception {
        when(google.verify("unverified")).thenReturn(new GoogleIdentity("x@gmail.com", "X", false));
        when(google.verify("no-config")).thenThrow(new AuthException(HttpStatus.SERVICE_UNAVAILABLE, "not configured"));

        mvc.perform(googleLogin("unverified")).andExpect(status().isUnauthorized());
        mvc.perform(googleLogin("no-config")).andExpect(status().isServiceUnavailable());
        assertThat(users.findByEmail("x@gmail.com")).isEmpty();
    }

    // ---------- helpers ----------

    private void save(String username, String mail, Role role, boolean enabled) {
        users.save(User.builder().username(username).email(mail).password(encoder.encode(PASSWORD))
                .role(role).enabled(enabled).phone(username.equals("admin") ? "0987654321" : null).build());
    }

    private static String registerBody(String username, String mail, String password, String phone) {
        return "{\"username\":\"" + username + "\",\"email\":\"" + mail + "\",\"password\":\"" + password
                + "\",\"fullName\":\"Người dùng mới\"" + (phone == null ? "" : ",\"phone\":\"" + phone + "\"") + "}";
    }

    private static org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder postJson(String url,
                                                                                                       String body) {
        return post(url).contentType(MediaType.APPLICATION_JSON).content(body);
    }

    private RequestBuilder login(String username, String password) {
        return postJson("/api/v1/auth/login", "{\"username\":\"" + username + "\",\"password\":\"" + password + "\"}");
    }

    private RequestBuilder googleLogin(String idToken) {
        return postJson("/api/v1/auth/google", "{\"googleIdToken\":\"" + idToken + "\"}");
    }

    private JsonNode tokens(String username) throws Exception {
        String body = mvc.perform(login(username, PASSWORD)).andReturn().getResponse().getContentAsString();
        return json.readTree(body).get("data");
    }

    private String bearer(String username) {
        User user = users.findByUsername(username).orElseThrow();
        return "Bearer " + jwtService.generateAccessToken(user.getUsername(), user.getRole().name());
    }
}