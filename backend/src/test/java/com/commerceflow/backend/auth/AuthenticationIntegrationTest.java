package com.commerceflow.backend.auth;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.net.CookieManager;
import java.net.CookiePolicy;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import static org.assertj.core.api.Assertions.*;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Testcontainers
@Import(AuthenticationIntegrationTest.ProbeConfiguration.class)
@org.junit.jupiter.api.extension.ExtendWith(org.springframework.boot.test.system.OutputCaptureExtension.class)
class AuthenticationIntegrationTest {
    // Unlike the local foundation suite, authentication tests fail if Docker is unavailable.
    @Container
    static final PostgreSQLContainer<?> POSTGRES = new PostgreSQLContainer<>("postgres:17");

    @DynamicPropertySource
    static void properties(DynamicPropertyRegistry registry) {
        registry.add("spring.datasource.url", POSTGRES::getJdbcUrl);
        registry.add("spring.datasource.username", POSTGRES::getUsername);
        registry.add("spring.datasource.password", POSTGRES::getPassword);
        registry.add("server.servlet.session.cookie.secure", () -> false);
    }

    @LocalServerPort int port;
    @Autowired ObjectMapper mapper;
    @Autowired JdbcTemplate jdbc;
    @Autowired PasswordEncoder passwords;
    @org.springframework.test.context.bean.override.mockito.MockitoSpyBean UserRepository users;
    @org.springframework.test.context.bean.override.mockito.MockitoSpyBean AuthService service;

    static final String PASSWORD = "test-only-password-123";

    final class Browser {
        final CookieManager cookies = new CookieManager(null, CookiePolicy.ACCEPT_ALL);
        final HttpClient client = HttpClient.newBuilder().cookieHandler(cookies).build();
        String token;

        HttpResponse<String> send(String method, String path, Object body, String csrf) throws Exception {
            var builder = HttpRequest.newBuilder(URI.create("http://localhost:" + port + path));
            if (csrf != null) builder.header("X-CSRF-TOKEN", csrf);
            if (body != null) builder.header("Content-Type", "application/json");
            builder.method(method, body == null ? HttpRequest.BodyPublishers.noBody()
                    : HttpRequest.BodyPublishers.ofString(mapper.writeValueAsString(body)));
            return client.send(builder.build(), HttpResponse.BodyHandlers.ofString());
        }

        HttpResponse<String> get(String path) throws Exception { return send("GET", path, null, null); }
        HttpResponse<String> post(String path, Object body) throws Exception { return send("POST", path, body, token); }
        void bootstrap() throws Exception {
            var response = get("/api/v1/auth/csrf");
            assertThat(response.statusCode()).isEqualTo(200);
            assertThat(json(response).get("headerName").asText()).isEqualTo("X-CSRF-TOKEN");
            token = json(response).get("token").asText();
            assertThat(token).isNotBlank();
        }
        String cookie() {
            return cookies.getCookieStore().getCookies().stream().filter(c -> c.getName().equals("SESSION"))
                    .findFirst().orElseThrow().getValue();
        }
    }

    String email() { return UUID.randomUUID() + "@example.com"; }
    Map<String, String> registration(String email) { return Map.of("email", email, "password", PASSWORD, "fullName", "Test Customer"); }
    JsonNode json(HttpResponse<String> response) throws Exception { return mapper.readTree(response.body()); }
    Browser registered(String email) throws Exception {
        var browser = new Browser(); browser.bootstrap();
        assertThat(browser.post("/api/v1/auth/register", registration(email)).statusCode()).isEqualTo(201);
        return browser;
    }
    void login(Browser browser, String email) throws Exception {
        var response = browser.post("/api/v1/auth/login", Map.of("email", email, "password", PASSWORD));
        assertThat(response.statusCode()).as(response.body()).isEqualTo(200);
    }
    void problem(HttpResponse<String> response, int status) throws Exception {
        assertThat(response.statusCode()).as(response.body()).isEqualTo(status);
        assertThat(response.headers().firstValue("Content-Type").orElseThrow()).startsWith("application/problem+json");
        assertThat(json(response).get("status").asInt()).isEqualTo(status);
        assertThat(json(response).get("title").asText()).isNotBlank();
        assertThat(json(response).get("type").asText()).isEqualTo("about:blank");
        assertThat(response.body()).doesNotContain(PASSWORD, "passwordHash", "stackTrace", "org.springframework");
        assertThat(json(response).get("code").asText()).isNotBlank();
        String id = json(response).get("requestId").asText();
        UUID.fromString(id);
        assertThat(response.headers().firstValue("X-Request-ID").orElseThrow()).isEqualTo(id);
        assertThat(json(response).get("instance").asText()).isEqualTo("urn:uuid:" + id);
    }

    void problem(HttpResponse<String> response, int status, String code) throws Exception {
        problem(response, status);
        assertThat(json(response).get("code").asText()).isEqualTo(code);
    }

    @Test
    void registrationNormalizesEmailHashesPasswordAndAssignsCustomerOnly() throws Exception {
        String email = email();
        var browser = new Browser(); browser.bootstrap();
        var response = browser.post("/api/v1/auth/register", registration("  " + email.toUpperCase() + "  "));
        assertThat(response.statusCode()).isEqualTo(201);
        assertThat(json(response).get("email").asText()).isEqualTo(email);
        assertThat(json(response).get("fullName").asText()).isEqualTo("Test Customer");
        assertThat(json(response).get("roles").toString()).isEqualTo("[\"CUSTOMER\"]");
        assertThat(json(response).size()).isEqualTo(4);
        UUID.fromString(json(response).get("id").asText());
        var hash = jdbc.queryForObject("SELECT password_hash FROM commerceflow.users WHERE email = ?", String.class, email);
        assertThat(hash).isNotEqualTo(PASSWORD);
        assertThat(passwords.matches(PASSWORD, hash)).isTrue();
        problem(browser.get("/api/v1/auth/me"), 401); // registration does not silently log in
        problem(browser.post("/api/v1/auth/register", registration(email.toUpperCase())), 409);
    }

    @Test
    void invalidRegistrationAndPrivilegeInjectionAreRejectedSafely() throws Exception {
        var browser = new Browser(); browser.bootstrap();
        for (var body : new Object[] {
                Map.of("email", "invalid", "password", "short", "fullName", ""),
                Map.of("email", email(), "password", PASSWORD, "fullName", "Test", "roles", new String[]{"ADMIN"}),
                Map.of("email", email(), "password", "x".repeat(129), "fullName", "Test"),
                Map.of("email", email(), "password", 1234567890123456L, "fullName", "Test"),
                Map.of("email", email(), "password", PASSWORD, "fullName", 123),
                Map.of("email", email(), "password", PASSWORD, "fullName", "x".repeat(51)),
                Map.of("email", email(), "password", PASSWORD)}) {
            problem(browser.post("/api/v1/auth/register", body), 400);
        }
        var invalid = browser.post("/api/v1/auth/register", Map.of("email", "invalid", "password", "short", "fullName", ""));
        assertThat(json(invalid).get("errors").has("password")).isTrue();
        assertThat(invalid.body()).doesNotContain("short");
    }

    @Test
    void missingInvalidAndCrossSessionCsrfAreRejectedForAllAuthWrites() throws Exception {
        var browser = new Browser(); browser.bootstrap();
        var other = new Browser(); other.bootstrap();
        for (String path : new String[]{"/api/v1/auth/register", "/api/v1/auth/login", "/api/v1/auth/logout"}) {
            problem(browser.send("POST", path, registration(email()), null), 403, "CSRF_INVALID");
            problem(browser.send("POST", path, registration(email()), "invalid"), 403, "CSRF_INVALID");
            problem(browser.send("POST", path, registration(email()), other.token), 403, "CSRF_INVALID");
        }
    }

    @Test
    void loginRotatesSessionRefreshesCsrfAndPersistsAuthenticationInPostgres() throws Exception {
        String email = email(); var browser = registered(email);
        String oldCookie = browser.cookie(); String oldToken = browser.token;
        login(browser, email.toUpperCase());
        String newCookie = browser.cookie();
        assertThat(newCookie).isNotEqualTo(oldCookie);
        var me = browser.get("/api/v1/auth/me");
        assertThat(me.statusCode()).isEqualTo(200);
        assertThat(json(me).get("email").asText()).isEqualTo(email);
        assertThat(jdbc.queryForObject("SELECT count(*) FROM commerceflow.spring_session WHERE principal_name = ?", Integer.class, email)).isEqualTo(1);
        assertThat(jdbc.queryForObject("SELECT count(*) FROM commerceflow.spring_session_attributes WHERE attribute_name = 'SPRING_SECURITY_CONTEXT'", Integer.class)).isPositive();
        var serialized = jdbc.queryForObject("""
                SELECT a.attribute_bytes FROM commerceflow.spring_session_attributes a
                JOIN commerceflow.spring_session s ON s.primary_id = a.session_primary_id
                WHERE s.principal_name = ? AND a.attribute_name = 'SPRING_SECURITY_CONTEXT'
                """, byte[].class, email);
        var hash = jdbc.queryForObject("SELECT password_hash FROM commerceflow.users WHERE email = ?", String.class, email);
        assertThat(new String(serialized, java.nio.charset.StandardCharsets.ISO_8859_1)).doesNotContain(PASSWORD, hash);
        var old = HttpClient.newHttpClient().send(HttpRequest.newBuilder(URI.create("http://localhost:" + port + "/api/v1/auth/me"))
                .header("Cookie", "SESSION=" + oldCookie).GET().build(), HttpResponse.BodyHandlers.ofString());
        problem(old, 401);
        problem(browser.send("POST", "/api/v1/auth/logout", null, oldToken), 403);
        browser.bootstrap(); assertThat(browser.token).isNotEqualTo(oldToken);
        assertThat(browser.get("/api/v1/auth/me").headers().firstValue("Cache-Control").orElseThrow()).contains("no-store");
    }

    @Test
    void failedLoginDoesNotAuthenticateOrDiscloseAccountExistence() throws Exception {
        String email = email(); var browser = registered(email);
        var wrong = browser.post("/api/v1/auth/login", Map.of("email", email, "password", "wrong-test-password"));
        var missing = browser.post("/api/v1/auth/login", Map.of("email", email(), "password", "wrong-test-password"));
        problem(wrong, 401); problem(missing, 401);
        for (String field : java.util.List.of("code", "status", "title", "detail")) {
            assertThat(json(wrong).get(field)).isEqualTo(json(missing).get(field));
        }
        problem(browser.get("/api/v1/auth/me"), 401);
    }

    @Test
    void logoutDeletesJdbcSessionExpiresCookieAndPreventsReplay() throws Exception {
        String email = email(); var browser = registered(email); login(browser, email); browser.bootstrap();
        String authenticatedCookie = browser.cookie();
        var logout = browser.post("/api/v1/auth/logout", null);
        assertThat(logout.statusCode()).isEqualTo(204);
        assertThat(logout.body()).isEmpty();
        assertThat(logout.headers().allValues("Set-Cookie")).anySatisfy(cookie -> assertThat(cookie).contains("SESSION=", "Max-Age=0"));
        assertThat(jdbc.queryForObject("SELECT count(*) FROM commerceflow.spring_session WHERE principal_name = ?", Integer.class, email)).isZero();
        var replay = HttpClient.newHttpClient().send(HttpRequest.newBuilder(URI.create("http://localhost:" + port + "/api/v1/auth/me"))
                .header("Cookie", "SESSION=" + authenticatedCookie).GET().build(), HttpResponse.BodyHandlers.ofString());
        problem(replay, 401);
        browser.bootstrap(); problem(browser.post("/api/v1/auth/logout", null), 401);
    }

    @Test
    void independentRoleMatrixUsesPersistedRolesForReadsWritesAndMe() throws Exception {
        var anonymous = new Browser();
        problem(anonymous.get("/api/v1/admin/probe"), 401, "UNAUTHENTICATED");
        problem(anonymous.get("/api/v1/account/probe"), 401, "UNAUTHENTICATED");
        for (var roles : java.util.List.of(java.util.Set.of("CUSTOMER"), java.util.Set.of("ADMIN"),
                java.util.Set.of("CUSTOMER", "ADMIN"), java.util.Set.<String>of())) {
            String email = email(); var browser = registered(email);
            jdbc.update("DELETE FROM commerceflow.user_roles WHERE user_id = (SELECT id FROM commerceflow.users WHERE email = ?)", email);
            for (String role : roles) jdbc.update("INSERT INTO commerceflow.user_roles (user_id, role_id) SELECT u.id, r.id FROM commerceflow.users u CROSS JOIN commerceflow.roles r WHERE u.email = ? AND r.name = ?", email, role);
            login(browser, email); browser.bootstrap();
            var me = browser.get("/api/v1/auth/me");
            assertThat(me.statusCode()).isEqualTo(200);
            var actual = new java.util.HashSet<String>(); json(me).get("roles").forEach(r -> actual.add(r.asText()));
            assertThat(actual).isEqualTo(roles);
            for (String required : java.util.List.of("ADMIN", "CUSTOMER")) {
                String path = required.equals("ADMIN") ? "/api/v1/admin/probe" : "/api/v1/account/probe";
                for (String method : java.util.List.of("GET", "POST")) {
                    var response = browser.send(method, path, null, browser.token);
                    if (roles.contains(required)) assertThat(response.statusCode()).isEqualTo(200);
                    else problem(response, 403, "ACCESS_DENIED");
                }
            }
        }
    }

    @Test
    void disabledAccountsCannotLogin() throws Exception {
        String email = email(); var browser = registered(email);
        jdbc.update("UPDATE commerceflow.users SET account_status = 'DISABLED' WHERE email = ?", email);
        problem(browser.post("/api/v1/auth/login", Map.of("email", email, "password", PASSWORD)), 401);
        problem(browser.get("/api/v1/auth/me"), 401);
    }

    @Test
    void concurrentNormalizedRegistrationsCannotCreateDuplicates(org.springframework.boot.test.system.CapturedOutput output) throws Exception {
        String email = email(); var first = new Browser(); first.bootstrap(); var second = new Browser(); second.bootstrap();
        var ready = new CountDownLatch(1);
        var bothPrechecks = new CountDownLatch(2);
        org.mockito.Mockito.doAnswer(invocation -> {
            bothPrechecks.countDown();
            if (!bothPrechecks.await(10, java.util.concurrent.TimeUnit.SECONDS)) throw new AssertionError("Both prechecks must run");
            return false;
        }).when(users).existsByEmail(email);
        try (var pool = Executors.newFixedThreadPool(2)) {
            var a = pool.submit(() -> { ready.await(); return first.post("/api/v1/auth/register", registration(email)); });
            var b = pool.submit(() -> { ready.await(); return second.post("/api/v1/auth/register", registration(email.toUpperCase())); });
            ready.countDown(); var responses = java.util.List.of(a.get(), b.get());
            assertThat(responses.stream().map(HttpResponse::statusCode).toList()).containsExactlyInAnyOrder(201, 409);
            for (var response : responses) if (response.statusCode() == 409) problem(response, 409, "EMAIL_CONFLICT");
        }
        assertThat(jdbc.queryForObject("SELECT count(*) FROM commerceflow.users WHERE email = ?", Integer.class, email)).isEqualTo(1);
        assertThat(output.getAll()).doesNotContain(email, email.toUpperCase(), PASSWORD);
    }

    @Test
    void cookieFlagsAndBodyFreeHealthRemainCorrect() throws Exception {
        var browser = new Browser(); var response = browser.get("/api/v1/auth/csrf");
        assertThat(response.headers().allValues("Set-Cookie")).anySatisfy(cookie -> assertThat(cookie).contains("HttpOnly", "SameSite=Lax", "Path=/"));
        assertThat(browser.get("/api/v1/health").statusCode()).isEqualTo(200);
        assertThat(browser.get("/actuator/health").statusCode()).isEqualTo(200);
    }

    @Test
    void expiredJdbcSessionCannotAccessAuthenticatedEndpoints() throws Exception {
        String email = email(); var browser = registered(email); login(browser, email);
        jdbc.update("UPDATE commerceflow.spring_session SET last_access_time = 0, expiry_time = 0 WHERE principal_name = ?", email);
        problem(browser.get("/api/v1/auth/me"), 401);
    }

    @Test
    void csrfProtectionAlsoCoversPutPatchAndDelete() throws Exception {
        String email = email(); var browser = registered(email); login(browser, email);
        for (String method : new String[]{"PUT", "PATCH", "DELETE"}) {
            problem(browser.send(method, "/api/v1/account/probe", Map.of(), null), 403);
        }
    }

    @Test
    void csrfQueryParameterCannotReplaceRequiredHeader() throws Exception {
        var browser = new Browser(); browser.bootstrap();
        String token = java.net.URLEncoder.encode(browser.token, java.nio.charset.StandardCharsets.UTF_8);
        problem(browser.send("POST", "/api/v1/auth/register?_csrf=" + token, registration(email()), null), 403);
    }

    @Test
    void submittedPasswordsAreNotWrittenToLogs(org.springframework.boot.test.system.CapturedOutput output) throws Exception {
        var browser = new Browser(); browser.bootstrap();
        String secret = "log-check-" + UUID.randomUUID();
        var response = browser.post("/api/v1/auth/register", Map.of("email", email(), "password", secret, "fullName", "Log Test"));
        assertThat(response.statusCode()).isEqualTo(201);
        assertThat(output.getAll()).doesNotContain(secret);
        assertThat(response.body()).doesNotContain(secret);
    }

    @Test
    void unicodeLengthsFollowOpenApiCharacterLimitsWithoutPasswordTruncation() throws Exception {
        String email = email(); var browser = new Browser(); browser.bootstrap();
        String password = "🔐".repeat(128);
        var registration = browser.post("/api/v1/auth/register", Map.of(
                "email", email, "password", password, "fullName", "😀".repeat(50)));
        assertThat(registration.statusCode()).as(registration.body()).isEqualTo(201);
        assertThat(browser.post("/api/v1/auth/login", Map.of("email", email, "password", password)).statusCode()).isEqualTo(200);
    }

    @Test
    void unrelatedPostgresCheckViolationIsInternalAndRollsBack(org.springframework.boot.test.system.CapturedOutput output) throws Exception {
        String email = email(); var browser = new Browser(); browser.bootstrap();
        jdbc.execute("ALTER TABLE commerceflow.users ADD CONSTRAINT cr04_non_email_probe CHECK (full_name <> 'Constraint Probe')");
        try {
            var response = browser.post("/api/v1/auth/register", Map.of("email", email, "password", PASSWORD, "fullName", "Constraint Probe"));
            problem(response, 500, "INTERNAL_ERROR");
            assertThat(response.body()).doesNotContain("cr04_non_email_probe", email, "SQL", "Constraint Probe");
            assertThat(jdbc.queryForObject("SELECT count(*) FROM commerceflow.users WHERE email = ?", Integer.class, email)).isZero();
            assertThat(output.getAll()).doesNotContain(email, PASSWORD, "Constraint Probe");
        } finally { jdbc.execute("ALTER TABLE commerceflow.users DROP CONSTRAINT cr04_non_email_probe"); }
    }

    @Test
    void internalProviderFailuresAreNotInvalidCredentials() throws Exception {
        String email = email(); var browser = new Browser(); browser.bootstrap();
        org.mockito.Mockito.doThrow(new org.springframework.security.authentication.InternalAuthenticationServiceException("private diagnostic"))
                .when(service).loadUserByUsername(email);
        var failure = browser.post("/api/v1/auth/login", Map.of("email", email, "password", PASSWORD));
        problem(failure, 500, "INTERNAL_ERROR"); assertThat(failure.body()).doesNotContain("private diagnostic");
        org.mockito.Mockito.doThrow(new org.springframework.security.authentication.InternalAuthenticationServiceException("private connection", new java.sql.SQLException("secret database", "08006")))
                .when(service).loadUserByUsername(email);
        var unavailable = browser.post("/api/v1/auth/login", Map.of("email", email, "password", PASSWORD));
        problem(unavailable, 503, "SERVICE_UNAVAILABLE");
        assertThat(unavailable.body()).doesNotContain("private connection", "secret database", "08006");
    }

    @Test
    void registrationRejectsUnknownJsonFieldsWithoutCreatingAnAccount() throws Exception {
        var browser = new Browser(); browser.bootstrap();
        String email = email();
        for (Object extra : new Object[]{"private-extra-value", true, Map.of("roles", "ADMIN")}) {
            var body = new java.util.HashMap<String, Object>(registration(email));
            body.put("unexpectedField", extra);
            var response = browser.post("/api/v1/auth/register", body);
            problem(response, 400, "INVALID_REQUEST");
            assertThat(response.body()).doesNotContain("unexpectedField", "private-extra-value");
            assertThat(users.existsByEmail(email)).isFalse();
            problem(browser.get("/api/v1/auth/me"), 401, "UNAUTHENTICATED");
        }
        // The same otherwise-valid payload succeeds once the unknown property is removed.
        assertThat(browser.post("/api/v1/auth/register", registration(email)).statusCode()).isEqualTo(201);
    }

    @Test
    void loginRejectsUnknownJsonFieldsWithoutAuthenticatingValidCredentials() throws Exception {
        String email = email(); var browser = registered(email);
        String anonymousSession = browser.cookie();
        for (Object extra : new Object[]{"private-extra-value", true, Map.of("roles", "ADMIN")}) {
            var response = browser.post("/api/v1/auth/login", Map.of(
                    "email", email, "password", PASSWORD, "unexpectedField", extra));
            problem(response, 400, "INVALID_REQUEST");
            assertThat(response.body()).doesNotContain("unexpectedField", "private-extra-value");
            assertThat(browser.cookie()).isEqualTo(anonymousSession);
            problem(browser.get("/api/v1/auth/me"), 401, "UNAUTHENTICATED");
        }
        login(browser, email);
        assertThat(browser.cookie()).isNotEqualTo(anonymousSession);
        assertThat(browser.get("/api/v1/auth/me").statusCode()).isEqualTo(200);
    }

    @Test
    void loginValidationAndProtocolErrorsHaveExactCodes() throws Exception {
        var browser = new Browser(); browser.bootstrap();
        for (Object body : new Object[]{Map.of(), Map.of("email", "invalid", "password", PASSWORD),
                Map.of("email", email()), java.util.Collections.singletonMap("email", null)}) {
            problem(browser.post("/api/v1/auth/login", body), 400, "VALIDATION_ERROR");
        }
        problem(browser.post("/api/v1/auth/login", Map.of("email", email(), "password", PASSWORD, "extra", true)), 400, "INVALID_REQUEST");
        problem(browser.post("/api/v1/auth/login", Map.of("email", email(), "password", "")), 401, "INVALID_CREDENTIALS");
        var request = HttpRequest.newBuilder(URI.create("http://localhost:" + port + "/api/v1/auth/login"))
                .header("Content-Type", "application/json").header("X-CSRF-TOKEN", browser.token)
                .POST(HttpRequest.BodyPublishers.ofString("{"));
        problem(browser.client.send(request.build(), HttpResponse.BodyHandlers.ofString()), 400, "INVALID_REQUEST");
        request.setHeader("Content-Type", "text/plain");
        problem(browser.client.send(request.build(), HttpResponse.BodyHandlers.ofString()), 415, "UNSUPPORTED_MEDIA_TYPE");
        String email = email(); var authenticated = registered(email); login(authenticated, email);
        var method = authenticated.get("/api/v1/auth/login"); problem(method, 405, "METHOD_NOT_ALLOWED");
        assertThat(method.headers().firstValue("Allow").orElseThrow()).contains("POST");
        assertThat(authenticated.get("/api/v1/auth/not-defined").statusCode()).isEqualTo(404);
    }

    @Test
    void correlationIsServerGeneratedAndConsistentAcrossSecurityResponses() throws Exception {
        var browser = new Browser();
        var request = HttpRequest.newBuilder(URI.create("http://localhost:" + port + "/api/v1/auth/me"))
                .header("X-Request-ID", "untrusted-client-id").GET().build();
        var response = browser.client.send(request, HttpResponse.BodyHandlers.ofString());
        problem(response, 401, "UNAUTHENTICATED");
        assertThat(response.body()).doesNotContain("untrusted-client-id");
        var second = browser.get("/api/v1/auth/me"); problem(second, 401, "UNAUTHENTICATED");
        assertThat(json(response).get("requestId")).isNotEqualTo(json(second).get("requestId"));
    }

    @Test
    void cr05BoundariesCountNormalizedEmailAndUnicodeWithoutTruncation() throws Exception {
        var browser = new Browser(); browser.bootstrap();
        String maximumEmail = "a".repeat(64) + "@" + "b".repeat(63) + "." + "c".repeat(63) + "." + "d".repeat(61);
        assertThat(maximumEmail.codePointCount(0,maximumEmail.length())).isEqualTo(254);
        var accepted = browser.post("/api/v1/auth/register", Map.of("email", "  " + maximumEmail.toUpperCase(java.util.Locale.ROOT) + "  ", "password", "🔐".repeat(12), "fullName", "😀".repeat(50)));
        assertThat(accepted.statusCode()).as(accepted.body()).isEqualTo(201);
        assertThat(json(accepted).get("email").asText()).isEqualTo(maximumEmail);
        assertThat(json(accepted).get("fullName").asText()).isEqualTo("😀".repeat(50));
        for (String name : java.util.List.of("😀".repeat(51), " ", "")) {
            problem(browser.post("/api/v1/auth/register", Map.of("email", email(), "password", PASSWORD, "fullName", name)),400,"VALIDATION_ERROR");
        }
        for (String password : java.util.List.of("🔐".repeat(11), "🔐".repeat(129))) {
            problem(browser.post("/api/v1/auth/register", Map.of("email", email(), "password", password, "fullName", "Test")),400,"VALIDATION_ERROR");
        }
        String tooLong = "a".repeat(64) + "@" + "b".repeat(63) + "." + "c".repeat(63) + "." + "d".repeat(62);
        problem(browser.post("/api/v1/auth/register", registration(tooLong)),400,"VALIDATION_ERROR");
        problem(browser.post("/api/v1/auth/login", Map.of("email", tooLong, "password", PASSWORD)),400,"VALIDATION_ERROR");
        var combining = browser.post("/api/v1/auth/register", Map.of("email", email(), "password", PASSWORD, "fullName", "e\u0301".repeat(25)));
        assertThat(combining.statusCode()).isEqualTo(201);
        assertThat(new RegisterRequest("\u0130@example.com", PASSWORD, "Test").email()).isEqualTo("i\u0307@example.com");
    }

    @TestConfiguration
    static class ProbeConfiguration {
        @Bean RoleProbe roleProbe() { return new RoleProbe(); }
    }
    // Test-only endpoints exercise role matchers without implementing deferred admin/catalog APIs.
    @RestController
    static class RoleProbe {
        @org.springframework.web.bind.annotation.RequestMapping(path = "/api/v1/admin/probe", method = {org.springframework.web.bind.annotation.RequestMethod.GET, org.springframework.web.bind.annotation.RequestMethod.POST}) String admin() { return "ok"; }
        @org.springframework.web.bind.annotation.RequestMapping(path = "/api/v1/account/probe", method = {org.springframework.web.bind.annotation.RequestMethod.GET, org.springframework.web.bind.annotation.RequestMethod.POST}) String customer() { return "ok"; }
    }
}
