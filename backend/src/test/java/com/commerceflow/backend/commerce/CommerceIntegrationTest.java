package com.commerceflow.backend.commerce;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.net.CookieManager;
import java.net.CookiePolicy;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.Callable;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.Executors;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Cart, checkout and orders against PostgreSQL (Sprint 4; design review scenarios REV-01–REV-03, REV-07–REV-09,
 * REV-12; CR-S4-01). Requires Docker; CI fails if this suite is skipped.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Testcontainers
class CommerceIntegrationTest {
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

    static final String MUG = "aa6357c0-e6bc-5e13-86d9-d5326ecaf437";
    static final String VASE = "1ce8dbdf-e0ad-5a9c-ab49-6ad53a250e1a";
    static final String SOLD_OUT = "698a7f52-45ed-5b61-b67e-59790357bd58";
    static final Map<String, String> ADDRESS = Map.of("recipientName", "Pat Doe", "addressLine1", "1 Main St",
            "city", "Seattle", "state", "WA", "postalCode", "98101");

    final class Browser {
        final HttpClient client = HttpClient.newBuilder().cookieHandler(new CookieManager(null, CookiePolicy.ACCEPT_ALL)).build();
        String token;

        HttpResponse<String> send(String method, String path, Object body, Map<String, String> headers) throws Exception {
            var builder = HttpRequest.newBuilder(URI.create("http://localhost:" + port + "/api/v1" + path));
            if (token != null && !method.equals("GET")) builder.header("X-CSRF-TOKEN", token);
            if (body != null) builder.header("Content-Type", "application/json");
            headers.forEach(builder::header);
            builder.method(method, body == null ? HttpRequest.BodyPublishers.noBody()
                    : HttpRequest.BodyPublishers.ofString(mapper.writeValueAsString(body)));
            return client.send(builder.build(), HttpResponse.BodyHandlers.ofString());
        }
        HttpResponse<String> get(String path) throws Exception { return send("GET", path, null, Map.of()); }
        HttpResponse<String> post(String path, Object body) throws Exception { return send("POST", path, body, Map.of()); }
        HttpResponse<String> post(String path, Object body, String key) throws Exception {
            return send("POST", path, body, Map.of("Idempotency-Key", key));
        }
        Browser csrf() throws Exception { token = json(get("/auth/csrf")).get("token").asText(); return this; }
    }

    JsonNode json(HttpResponse<String> response) throws Exception { return mapper.readTree(response.body()); }
    String key() { return "test-" + UUID.randomUUID(); }
    int stock(String productId) { return jdbc.queryForObject("SELECT stock_quantity FROM commerceflow.products WHERE id = ?::uuid", Integer.class, productId); }
    long orders() { return jdbc.queryForObject("SELECT count(*) FROM commerceflow.orders", Long.class); }

    Map<String, Object> guestOrder(String email, String payment, List<Map<String, Object>> items) {
        return Map.of("email", email, "shippingAddress", ADDRESS, "deliveryMethod", "STANDARD", "paymentScenario", payment, "items", items);
    }
    List<Map<String, Object>> lines(Object... productQuantity) {
        var result = new ArrayList<Map<String, Object>>();
        for (int i = 0; i < productQuantity.length; i += 2) result.add(Map.of("productId", productQuantity[i], "quantity", productQuantity[i + 1]));
        return result;
    }

    Browser member() throws Exception {
        var browser = new Browser().csrf();
        String email = "member-" + UUID.randomUUID() + "@example.com";
        assertThat(browser.post("/auth/register", Map.of("email", email, "password", "member-password-1", "fullName", "Member")).statusCode()).isEqualTo(201);
        assertThat(browser.post("/auth/login", Map.of("email", email, "password", "member-password-1")).statusCode()).isEqualTo(200);
        return browser.csrf();
    }

    @BeforeEach
    void resetStock() {
        jdbc.update("UPDATE commerceflow.products SET stock_quantity = CASE WHEN slug IN ('compact-sofa-rust', 'oak-step-stool') THEN 0 ELSE 25 END");
    }

    @Test
    void guestCheckoutCreatesOrderAndReplaysWithoutSecondDecrement() throws Exception { // REV-01
        var guest = new Browser().csrf();
        String key = key();
        var request = guestOrder(" Guest@Example.com ", "APPROVE", lines(MUG, 2, VASE, 1));
        var first = guest.post("/checkout/guest", request, key);
        assertThat(first.statusCode()).as(first.body()).isEqualTo(201);
        var order = json(first);
        assertThat(order.get("orderNumber").asText()).matches("^CF-[A-Z0-9]{8}$");
        assertThat(order.get("contactEmail").asText()).isEqualTo("guest@example.com");
        assertThat(order.get("subtotalAmount").asText()).isEqualTo("104.00");
        assertThat(order.get("shippingAmount").asText()).isEqualTo("0.00");
        assertThat(order.get("totalAmount").asText()).isEqualTo("104.00");
        assertThat(order.get("guest").asBoolean()).isTrue();
        assertThat(stock(MUG)).isEqualTo(23);

        var replay = guest.post("/checkout/guest", request, key);
        assertThat(replay.statusCode()).isEqualTo(201);
        assertThat(replay.headers().firstValue("Idempotent-Replayed")).contains("true");
        assertThat(replay.body()).isEqualTo(first.body());
        assertThat(stock(MUG)).isEqualTo(23);
    }

    @Test
    void sameKeyWithChangedRequestIsRejectedWithoutSideEffects() throws Exception { // REV-02
        var guest = new Browser().csrf();
        String key = key();
        assertThat(guest.post("/checkout/guest", guestOrder("a@example.com", "APPROVE", lines(MUG, 1)), key).statusCode()).isEqualTo(201);
        long before = orders();
        var changed = guest.post("/checkout/guest", guestOrder("a@example.com", "APPROVE", lines(MUG, 2)), key);
        assertThat(changed.statusCode()).isEqualTo(409);
        assertThat(json(changed).get("code").asText()).isEqualTo("IDEMPOTENCY_PAYLOAD_MISMATCH");
        assertThat(orders()).isEqualTo(before);
        assertThat(stock(MUG)).isEqualTo(24);
    }

    @Test
    void concurrentSameKeyRequestsCreateOneOrder() throws Exception { // REV-03
        var guest = new Browser().csrf();
        String key = key();
        var request = guestOrder("same@example.com", "APPROVE", lines(VASE, 1));
        var results = race(8, () -> guest.post("/checkout/guest", request, key));
        var orderIds = new ArrayList<String>();
        for (var r : results) if (r.statusCode() == 201) orderIds.add(json(r).get("id").asText());
        assertThat(orderIds).isNotEmpty();
        assertThat(Set.copyOf(orderIds)).hasSize(1);
        for (var r : results) {
            if (r.statusCode() != 201) {
                assertThat(r.statusCode()).isEqualTo(409);
                assertThat(json(r).get("code").asText()).isEqualTo("IDEMPOTENCY_IN_PROGRESS");
                assertThat(r.headers().firstValue("Retry-After")).isPresent();
            }
        }
        assertThat(stock(VASE)).isEqualTo(24);
    }

    @Test
    void declinedPaymentIsTerminalAndReplayableAndChangesNothing() throws Exception { // REV-07
        var guest = new Browser().csrf();
        String key = key();
        long before = orders();
        var request = guestOrder("d@example.com", "DECLINE", lines(MUG, 1));
        var declined = guest.post("/checkout/guest", request, key);
        assertThat(declined.statusCode()).isEqualTo(402);
        assertThat(json(declined).get("code").asText()).isEqualTo("PAYMENT_DECLINED");
        assertThat(json(declined).get("requestId").asText()).isNotBlank();
        var replay = guest.post("/checkout/guest", request, key);
        assertThat(replay.statusCode()).isEqualTo(402);
        assertThat(replay.headers().firstValue("Idempotent-Replayed")).contains("true");
        assertThat(orders()).isEqualTo(before);
        assertThat(stock(MUG)).isEqualTo(25);
    }

    @Test
    void temporarilyUnavailablePaymentIsRetryableWithTheSameKey() throws Exception { // REV-08
        var guest = new Browser().csrf();
        String key = key();
        var unavailable = guest.post("/checkout/guest", guestOrder("u@example.com", "UNAVAILABLE", lines(MUG, 1)), key);
        assertThat(unavailable.statusCode()).isEqualTo(503);
        assertThat(json(unavailable).get("code").asText()).isEqualTo("PAYMENT_TEMPORARILY_UNAVAILABLE");
        assertThat(unavailable.headers().firstValue("Retry-After")).isPresent();
        assertThat(stock(MUG)).isEqualTo(25);
        // Nothing was stored for the key, so the same request is processed again.
        assertThat(guest.post("/checkout/guest", guestOrder("u@example.com", "UNAVAILABLE", lines(MUG, 1)), key).statusCode()).isEqualTo(503);
    }

    @Test
    void twoBuyersForTheLastUnitProduceExactlyOneOrder() throws Exception { // REV-09
        jdbc.update("UPDATE commerceflow.products SET stock_quantity = 1 WHERE id = ?::uuid", VASE);
        var results = race(6, () -> new Browser().csrf().post("/checkout/guest",
                guestOrder("buyer-" + UUID.randomUUID() + "@example.com", "APPROVE", lines(VASE, 1)), key()));
        assertThat(results.stream().filter(r -> r.statusCode() == 201)).hasSize(1);
        for (var r : results) if (r.statusCode() != 201) assertThat(json(r).get("code").asText()).isEqualTo("INSUFFICIENT_STOCK");
        assertThat(stock(VASE)).isZero();
    }

    @Test
    void securityBoundariesHold() throws Exception { // REV-12
        var noCsrf = new Browser();
        noCsrf.get("/auth/csrf"); // session exists, token not sent
        var rejected = noCsrf.post("/checkout/guest", guestOrder("x@example.com", "APPROVE", lines(MUG, 1)), key());
        assertThat(rejected.statusCode()).isEqualTo(403);
        assertThat(json(rejected).get("code").asText()).isEqualTo("CSRF_INVALID");
        var anonymous = new Browser().csrf();
        assertThat(anonymous.get("/cart").statusCode()).isEqualTo(401);
        assertThat(anonymous.get("/orders").statusCode()).isEqualTo(401);
        assertThat(anonymous.post("/orders", Map.of("shippingAddress", ADDRESS, "deliveryMethod", "STANDARD", "paymentScenario", "APPROVE"), key()).statusCode()).isEqualTo(401);
        assertThat(stock(MUG)).isEqualTo(25);

        var member = member();
        assertThat(member.post("/checkout/guest", guestOrder("m@example.com", "APPROVE", lines(MUG, 1)), key()).statusCode()).isEqualTo(403);
        var guestOrder = json(anonymous.post("/checkout/guest", guestOrder("g@example.com", "APPROVE", lines(MUG, 1)), key()));
        assertThat(member.get("/orders/" + guestOrder.get("id").asText()).statusCode()).isEqualTo(404);
    }

    @Test
    void memberCartMergeCheckoutHistoryAndCartClearing() throws Exception {
        var member = member();
        assertThat(member.post("/cart/items", Map.of("productId", VASE, "quantity", 1)).statusCode()).isEqualTo(200);
        assertThat(json(member.post("/cart/items", Map.of("productId", SOLD_OUT, "quantity", 1))).get("code").asText()).isEqualTo("PRODUCT_UNAVAILABLE");
        var merged = json(member.post("/cart/merge", Map.of("items", lines(VASE, 10, MUG, 1, SOLD_OUT, 1))));
        assertThat(merged.get("skippedProductIds").toString()).contains(SOLD_OUT);
        var quantities = new java.util.HashMap<String, Integer>();
        merged.get("cart").get("items").forEach(i -> quantities.put(i.get("productId").asText(), i.get("quantity").asInt()));
        assertThat(quantities).containsEntry(VASE, 10).containsEntry(MUG, 1);

        String vaseItem = null;
        for (var item : merged.get("cart").get("items")) if (item.get("productId").asText().equals(VASE)) vaseItem = item.get("id").asText();
        assertThat(json(member.send("PATCH", "/cart/items/" + vaseItem, Map.of("quantity", 2), Map.of())).get("estimatedTotal").asText()).isEqualTo("154.00");

        String key = key();
        var request = Map.of("shippingAddress", ADDRESS, "deliveryMethod", "EXPRESS", "paymentScenario", "APPROVE");
        var created = member.post("/orders", request, key);
        assertThat(created.statusCode()).as(created.body()).isEqualTo(201);
        assertThat(json(created).get("totalAmount").asText()).isEqualTo("173.00");
        assertThat(json(created).get("guest").asBoolean()).isFalse();
        assertThat(json(member.get("/cart")).get("items")).isEmpty();
        // Replay after the cart was cleared returns the original order (checkout reliability supplement §3).
        assertThat(json(member.post("/orders", request, key)).get("id").asText()).isEqualTo(json(created).get("id").asText());
        assertThat(json(member.post("/orders", request, key())).get("code").asText()).isEqualTo("CART_EMPTY");
        var history = json(member.get("/orders"));
        assertThat(history).hasSize(1);
        assertThat(json(member.get("/orders/" + json(created).get("id").asText())).get("orderNumber").asText())
                .isEqualTo(json(created).get("orderNumber").asText());
    }

    @Test
    void orderLookupNeedsNumberAndEmailAndIsRateLimited() throws Exception {
        var guest = new Browser().csrf();
        var order = json(guest.post("/checkout/guest", guestOrder("track@example.com", "APPROVE", lines(MUG, 1)), key()));
        var other = new Browser().csrf();
        var found = other.post("/orders/lookup", Map.of("orderNumber", order.get("orderNumber").asText().toLowerCase(), "email", "TRACK@example.com"));
        assertThat(found.statusCode()).isEqualTo(200);
        assertThat(json(found).get("id").asText()).isEqualTo(order.get("id").asText());
        var wrong = other.post("/orders/lookup", Map.of("orderNumber", order.get("orderNumber").asText(), "email", "else@example.com"));
        assertThat(wrong.statusCode()).isEqualTo(404);
        assertThat(json(wrong).get("code").asText()).isEqualTo("RESOURCE_NOT_FOUND");
        int last = 0;
        for (int i = 0; i < 10; i++) last = other.post("/orders/lookup", Map.of("orderNumber", "CF-AAAAAAAA", "email", "x@example.com")).statusCode();
        assertThat(last).isEqualTo(429);
    }

    @Test
    void invalidRequestsReportFieldsWithoutStoringAnything() throws Exception {
        var guest = new Browser().csrf();
        String key = key();
        var badZip = Map.of("email", "z@example.com", "shippingAddress", Map.of("recipientName", "Z", "addressLine1", "1 Main St",
                "city", "Seattle", "state", "WA", "postalCode", "abc"), "deliveryMethod", "STANDARD", "paymentScenario", "APPROVE",
                "items", lines(MUG, 1));
        var response = guest.post("/checkout/guest", badZip, key);
        assertThat(response.statusCode()).isEqualTo(400);
        assertThat(json(response).get("errors").has("shippingAddress.postalCode")).isTrue();
        assertThat(json(guest.post("/checkout/guest", guestOrder("z@example.com", "APPROVE", lines(MUG, 1)), "short")).get("code").asText())
                .isEqualTo("INVALID_REQUEST");
        assertThat(jdbc.queryForObject("SELECT count(*) FROM commerceflow.checkout_idempotency WHERE idempotency_key = ?", Long.class, key)).isZero();
    }

    List<HttpResponse<String>> race(int requests, Callable<HttpResponse<String>> call) throws Exception {
        var start = new CountDownLatch(1);
        try (var pool = Executors.newFixedThreadPool(requests)) {
            var futures = new ArrayList<java.util.concurrent.Future<HttpResponse<String>>>();
            for (int i = 0; i < requests; i++) futures.add(pool.submit(() -> { start.await(); return call.call(); }));
            start.countDown();
            var results = new ArrayList<HttpResponse<String>>();
            for (var future : futures) results.add(future.get());
            return results;
        }
    }
}
