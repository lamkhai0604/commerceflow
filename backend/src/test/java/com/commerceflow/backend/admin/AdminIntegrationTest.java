package com.commerceflow.backend.admin;

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
 * Administration against PostgreSQL (Sprint 5; design review scenarios REV-10, REV-11 and the administrator part of
 * REV-12; TC-CANCEL-001, TC-CANCEL-002, TC-INV-002; S5-D01 to S5-D04). Requires Docker; CI fails if this suite is skipped.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Testcontainers
class AdminIntegrationTest {
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
    static final Map<String, String> ADDRESS = Map.of("recipientName", "Pat Doe", "addressLine1", "1 Main St",
            "city", "Seattle", "state", "WA", "postalCode", "98101");

    final class Browser {
        final HttpClient client = HttpClient.newBuilder().cookieHandler(new CookieManager(null, CookiePolicy.ACCEPT_ALL)).build();
        String token;
        String email;

        HttpResponse<String> send(String method, String path, Object body, Map<String, String> headers, boolean withToken) throws Exception {
            var builder = HttpRequest.newBuilder(URI.create("http://localhost:" + port + "/api/v1" + path));
            if (withToken && token != null && !method.equals("GET")) builder.header("X-CSRF-TOKEN", token);
            if (body != null) builder.header("Content-Type", "application/json");
            headers.forEach(builder::header);
            builder.method(method, body == null ? HttpRequest.BodyPublishers.noBody()
                    : HttpRequest.BodyPublishers.ofString(mapper.writeValueAsString(body)));
            return client.send(builder.build(), HttpResponse.BodyHandlers.ofString());
        }
        HttpResponse<String> get(String path) throws Exception { return send("GET", path, null, Map.of(), true); }
        HttpResponse<String> post(String path, Object body) throws Exception { return send("POST", path, body, Map.of(), true); }
        HttpResponse<String> post(String path, Object body, String key) throws Exception { return send("POST", path, body, Map.of("Idempotency-Key", key), true); }
        HttpResponse<String> patch(String path, Object body) throws Exception { return send("PATCH", path, body, Map.of(), true); }
        Browser csrf() throws Exception { token = json(get("/auth/csrf")).get("token").asText(); return this; }
    }

    JsonNode json(HttpResponse<String> response) throws Exception { return mapper.readTree(response.body()); }
    int stock(String productId) { return jdbc.queryForObject("SELECT stock_quantity FROM commerceflow.products WHERE id = ?::uuid", Integer.class, productId); }
    void setStock(String productId, int stock) { jdbc.update("UPDATE commerceflow.products SET stock_quantity = ? WHERE id = ?::uuid", stock, productId); }

    /** A customer, or an administrator when the role is granted before log-in (roles are read at log-in). */
    Browser account(boolean admin) throws Exception {
        var browser = new Browser().csrf();
        browser.email = (admin ? "admin-" : "member-") + UUID.randomUUID() + "@example.com";
        assertThat(browser.post("/auth/register", Map.of("email", browser.email, "password", "account-password-1", "fullName", "Account")).statusCode()).isEqualTo(201);
        if (admin) {
            jdbc.update("INSERT INTO commerceflow.user_roles (user_id, role_id) SELECT u.id, r.id FROM commerceflow.users u, commerceflow.roles r WHERE u.email = ? AND r.name = 'ADMIN'", browser.email);
        }
        assertThat(browser.post("/auth/login", Map.of("email", browser.email, "password", "account-password-1")).statusCode()).isEqualTo(200);
        return browser.csrf();
    }

    /** Places a guest order for `quantity` of a product and returns the order. */
    JsonNode buy(String product, int quantity) throws Exception {
        var guest = new Browser().csrf();
        var response = guest.post("/checkout/guest", Map.of("email", "guest-" + UUID.randomUUID() + "@example.com", "shippingAddress", ADDRESS,
                "deliveryMethod", "STANDARD", "paymentScenario", "APPROVE", "items", List.of(Map.of("productId", product, "quantity", quantity))),
                "key-" + UUID.randomUUID());
        assertThat(response.statusCode()).as(response.body()).isEqualTo(201);
        return json(response);
    }

    String status(Browser admin, JsonNode order, String status, String reason) throws Exception {
        var body = reason == null ? Map.<String, Object>of("status", status) : Map.<String, Object>of("status", status, "reason", reason);
        return admin.patch("/admin/orders/" + order.get("id").asText() + "/status", body).body();
    }

    @BeforeEach
    void resetData() {
        jdbc.update("DELETE FROM commerceflow.admin_audit_log");
        jdbc.update("""
                UPDATE commerceflow.products SET stock_quantity = 25, active = true,
                    price = CASE WHEN id = ?::uuid THEN 18.00 ELSE price END,
                    name = CASE WHEN id = ?::uuid THEN 'Stoneware Mug' ELSE name END""", MUG, MUG);
    }

    @Test
    void onlyAdministratorsReachAdministrationAndWritesNeedTheCsrfToken() throws Exception { // REV-12
        var anonymous = new Browser().csrf();
        assertThat(anonymous.get("/admin/orders").statusCode()).isEqualTo(401);
        var customer = account(false);
        assertThat(customer.get("/admin/orders").statusCode()).isEqualTo(403);
        assertThat(customer.get("/admin/products").statusCode()).isEqualTo(403);
        assertThat(customer.patch("/admin/products/" + MUG + "/inventory", Map.of("stockQuantity", 99)).statusCode()).isEqualTo(403);
        assertThat(stock(MUG)).isEqualTo(25);

        var admin = account(true);
        assertThat(admin.get("/admin/orders").statusCode()).isEqualTo(200);
        var noToken = admin.send("PATCH", "/admin/products/" + MUG + "/inventory", Map.of("stockQuantity", 99), Map.of(), false);
        assertThat(noToken.statusCode()).isEqualTo(403);
        assertThat(json(noToken).get("code").asText()).isEqualTo("CSRF_INVALID");
        assertThat(stock(MUG)).isEqualTo(25);
    }

    @Test
    void ordersMoveThroughConfirmedShippedDeliveredAndEveryChangeIsAudited() throws Exception {
        var admin = account(true);
        var order = buy(MUG, 2);
        String id = order.get("id").asText();

        assertThat(json(admin.patch("/admin/orders/" + id + "/status", Map.of("status", "DELIVERED"))).get("code").asText()).isEqualTo("INVALID_STATE_TRANSITION");
        assertThat(admin.patch("/admin/orders/" + id + "/status", Map.of("status", "CONFIRMED")).statusCode()).isEqualTo(409);

        var shipped = admin.patch("/admin/orders/" + id + "/status", Map.of("status", "SHIPPED", "reason", "Packed at dock 2"));
        assertThat(shipped.statusCode()).as(shipped.body()).isEqualTo(200);
        assertThat(json(shipped).get("order").get("orderStatus").asText()).isEqualTo("SHIPPED");
        assertThat(admin.patch("/admin/orders/" + id + "/status", Map.of("status", "SHIPPED")).statusCode()).isEqualTo(409);
        assertThat(json(admin.patch("/admin/orders/" + id + "/status", Map.of("status", "DELIVERED"))).get("order").get("orderStatus").asText()).isEqualTo("DELIVERED");

        var detail = json(admin.get("/admin/orders/" + id));
        var history = detail.get("history");
        assertThat(history).hasSize(2);
        assertThat(history.get(0).get("action").asText()).isEqualTo("ORDER_SHIPPED");
        assertThat(history.get(0).get("reason").asText()).isEqualTo("Packed at dock 2");
        assertThat(history.get(0).get("actorEmail").asText()).isEqualTo(admin.email);
        assertThat(history.get(0).get("details").get("from").asText()).isEqualTo("CONFIRMED");
        assertThat(history.get(1).get("action").asText()).isEqualTo("ORDER_DELIVERED");

        assertThat(admin.get("/admin/orders/" + UUID.randomUUID()).statusCode()).isEqualTo(404);
        assertThat(admin.patch("/admin/orders/" + UUID.randomUUID() + "/status", Map.of("status", "SHIPPED")).statusCode()).isEqualTo(404);
        assertThat(admin.patch("/admin/orders/" + id + "/status", Map.of("status", "LOST")).statusCode()).isEqualTo(400);
        assertThat(admin.patch("/admin/orders/" + id + "/status", Map.of("status", "SHIPPED", "reason", "x".repeat(201))).statusCode()).isEqualTo(400);
        assertThat(stock(MUG)).isEqualTo(23);
    }

    @Test
    void cancellingRestoresStockAndRefundsOnceAndRepeatsAreRejected() throws Exception { // FR-16A
        var admin = account(true);
        var order = buy(MUG, 3);
        assertThat(stock(MUG)).isEqualTo(22);

        var cancelled = admin.patch("/admin/orders/" + order.get("id").asText() + "/status", Map.of("status", "CANCELLED", "reason", "Customer asked"));
        assertThat(cancelled.statusCode()).as(cancelled.body()).isEqualTo(200);
        assertThat(json(cancelled).get("order").get("orderStatus").asText()).isEqualTo("CANCELLED");
        assertThat(json(cancelled).get("order").get("paymentStatus").asText()).isEqualTo("REFUNDED");
        assertThat(stock(MUG)).isEqualTo(25);

        var again = admin.patch("/admin/orders/" + order.get("id").asText() + "/status", Map.of("status", "CANCELLED"));
        assertThat(again.statusCode()).isEqualTo(409);
        assertThat(stock(MUG)).isEqualTo(25);
    }

    @Test
    void shippedOrdersCannotBeCancelledAndStockIsUntouched() throws Exception { // TC-CANCEL-002
        var admin = account(true);
        var order = buy(MUG, 2);
        status(admin, order, "SHIPPED", null);
        var response = admin.patch("/admin/orders/" + order.get("id").asText() + "/status", Map.of("status", "CANCELLED"));
        assertThat(response.statusCode()).isEqualTo(409);
        assertThat(json(response).get("code").asText()).isEqualTo("INVALID_STATE_TRANSITION");
        assertThat(stock(MUG)).isEqualTo(23);
        assertThat(jdbc.queryForObject("SELECT order_status FROM commerceflow.orders WHERE id = ?::uuid", String.class, order.get("id").asText())).isEqualTo("SHIPPED");
    }

    @Test
    void concurrentCancellationsSucceedOnceAndRestoreStockOnce() throws Exception { // REV-10, TC-CANCEL-001
        var admins = new ArrayList<Browser>();
        for (int i = 0; i < 4; i++) admins.add(account(true));
        var order = buy(MUG, 4);
        assertThat(stock(MUG)).isEqualTo(21);

        var results = race(8, i -> admins.get(i % admins.size()).patch("/admin/orders/" + order.get("id").asText() + "/status",
                Map.of("status", "CANCELLED")).statusCode());
        assertThat(results.stream().filter(code -> code == 200)).hasSize(1);
        assertThat(results.stream().filter(code -> code == 409)).hasSize(7);
        assertThat(stock(MUG)).isEqualTo(25);
        assertThat(jdbc.queryForObject("SELECT count(*) FROM commerceflow.admin_audit_log WHERE entity_id = ?::uuid AND action = 'ORDER_CANCELLED'",
                Long.class, order.get("id").asText())).isEqualTo(1);
    }

    @Test
    void aStockEditRacingWithCheckoutNeverLosesAnUpdateOrGoesNegative() throws Exception { // REV-11, TC-INV-002
        var admin = account(true);
        setStock(VASE, 10);
        // Ten buyers take one unit each while the administrator sets the stock to 50 at the same moment.
        var results = race(11, i -> {
            if (i == 5) return admin.patch("/admin/products/" + VASE + "/inventory", Map.of("stockQuantity", 50)).statusCode();
            return new Browser().csrf().post("/checkout/guest", Map.of("email", "race" + i + "@example.com", "shippingAddress", ADDRESS,
                    "deliveryMethod", "STANDARD", "paymentScenario", "APPROVE", "items", List.of(Map.of("productId", VASE, "quantity", 1))),
                    "race-key-" + UUID.randomUUID()).statusCode();
        });
        assertThat(results.stream().filter(code -> code == 201)).hasSize(10);
        assertThat(results).contains(200);
        // Whatever the interleaving: the edit replaced the stock it saw (`from`), and every unit sold after it came off the new value.
        int from = jdbc.queryForObject("SELECT (details->>'from')::int FROM commerceflow.admin_audit_log WHERE entity_id = ?::uuid AND action = 'STOCK_SET'", Integer.class, VASE);
        assertThat(stock(VASE)).isEqualTo(50 - from).isGreaterThanOrEqualTo(40);
    }

    @Test
    void aStockEditWithAStaleExpectedValueIsRejected() throws Exception {
        var admin = account(true);
        var stale = admin.patch("/admin/products/" + MUG + "/inventory", Map.of("stockQuantity", 40, "expectedStockQuantity", 24));
        assertThat(stale.statusCode()).isEqualTo(409);
        assertThat(json(stale).get("code").asText()).isEqualTo("STOCK_CHANGED");
        assertThat(stock(MUG)).isEqualTo(25);

        var current = admin.patch("/admin/products/" + MUG + "/inventory", Map.of("stockQuantity", 40, "expectedStockQuantity", 25));
        assertThat(current.statusCode()).as(current.body()).isEqualTo(200);
        assertThat(json(current).get("stockQuantity").asInt()).isEqualTo(40);
        assertThat(admin.patch("/admin/products/" + MUG + "/inventory", Map.of("stockQuantity", -1)).statusCode()).isEqualTo(400);
        assertThat(admin.patch("/admin/products/" + UUID.randomUUID() + "/inventory", Map.of("stockQuantity", 1)).statusCode()).isEqualTo(404);
        assertThat(stock(MUG)).isEqualTo(40);
    }

    @Test
    void deactivatingAProductHidesItAndBlocksPurchaseAndPriceChangesApplyToNewOrdersOnly() throws Exception {
        var admin = account(true);
        var before = buy(MUG, 1);

        var changed = admin.patch("/admin/products/" + MUG, Map.of("price", "20.50", "name", "Stoneware Mug, Large"));
        assertThat(changed.statusCode()).as(changed.body()).isEqualTo(200);
        assertThat(json(changed).get("price").asText()).isEqualTo("20.50");
        var after = buy(MUG, 1);
        assertThat(after.get("subtotalAmount").asText()).isEqualTo("20.50");
        assertThat(json(admin.get("/admin/orders/" + before.get("id").asText())).get("order").get("subtotalAmount").asText()).isEqualTo("18.00");

        assertThat(admin.patch("/admin/products/" + MUG, Map.of("active", false)).statusCode()).isEqualTo(200);
        var guest = new Browser().csrf();
        assertThat(guest.get("/products/" + MUG).statusCode()).isEqualTo(404);
        assertThat(guest.get("/products?q=Stoneware+Mug").body()).doesNotContain(MUG);
        var member = account(false);
        assertThat(json(member.post("/cart/items", Map.of("productId", MUG, "quantity", 1))).get("code").asText()).isEqualTo("PRODUCT_UNAVAILABLE");
        var blocked = guest.post("/checkout/guest", Map.of("email", "late@example.com", "shippingAddress", ADDRESS, "deliveryMethod", "STANDARD",
                "paymentScenario", "APPROVE", "items", List.of(Map.of("productId", MUG, "quantity", 1))), "key-" + UUID.randomUUID());
        assertThat(blocked.statusCode()).isEqualTo(409);
        assertThat(json(blocked).get("code").asText()).isEqualTo("INSUFFICIENT_STOCK");
        assertThat(admin.get("/admin/products?q=large").body()).contains(MUG);

        assertThat(admin.patch("/admin/products/" + MUG, Map.of("active", true)).statusCode()).isEqualTo(200);
        assertThat(guest.get("/products/" + MUG).statusCode()).isEqualTo(200);
        assertThat(jdbc.queryForObject("SELECT count(*) FROM commerceflow.admin_audit_log WHERE entity_id = ?::uuid AND action = 'PRODUCT_UPDATED'", Long.class, MUG)).isEqualTo(3);
    }

    @Test
    void invalidProductChangesAreRejectedWithoutSideEffects() throws Exception {
        var admin = account(true);
        assertThat(admin.patch("/admin/products/" + MUG, Map.of()).statusCode()).isEqualTo(400);
        assertThat(admin.patch("/admin/products/" + MUG, Map.of("price", "-1.00")).statusCode()).isEqualTo(400);
        assertThat(admin.patch("/admin/products/" + MUG, Map.of("price", "1.234")).statusCode()).isEqualTo(400);
        assertThat(admin.patch("/admin/products/" + MUG, Map.of("name", " ")).statusCode()).isEqualTo(400);
        assertThat(admin.patch("/admin/products/" + MUG, Map.of("slug", "new-slug")).statusCode()).isEqualTo(400);
        assertThat(admin.patch("/admin/products/" + UUID.randomUUID(), Map.of("active", false)).statusCode()).isEqualTo(404);
        assertThat(jdbc.queryForObject("SELECT count(*) FROM commerceflow.admin_audit_log WHERE entity_id = ?::uuid", Long.class, MUG)).isZero();
    }

    @Test
    void lowStockIsShownAndInsufficientStockNamesTheShortProduct() throws Exception { // S5-D04
        var guest = new Browser().csrf();
        setStock(MUG, 3);
        assertThat(json(guest.get("/products/" + MUG)).get("stockLeft").asInt()).isEqualTo(3);
        setStock(MUG, 6);
        assertThat(json(guest.get("/products/" + MUG)).has("stockLeft")).isFalse();
        setStock(MUG, 0);
        assertThat(json(guest.get("/products/" + MUG)).has("stockLeft")).isFalse();
        setStock(MUG, 3);

        String key = "short-" + UUID.randomUUID();
        var request = Map.of("email", "short@example.com", "shippingAddress", ADDRESS, "deliveryMethod", "STANDARD", "paymentScenario", "APPROVE",
                "items", List.of(Map.of("productId", MUG, "quantity", 5), Map.of("productId", VASE, "quantity", 1)));
        var first = guest.post("/checkout/guest", request, key);
        assertThat(first.statusCode()).isEqualTo(409);
        var shortages = json(first).get("shortages");
        assertThat(shortages).hasSize(1);
        assertThat(shortages.get(0).get("productId").asText()).isEqualTo(MUG);
        assertThat(shortages.get(0).get("productName").asText()).isEqualTo("Stoneware Mug");
        assertThat(shortages.get(0).get("requested").asInt()).isEqualTo(5);
        assertThat(shortages.get(0).get("available").asInt()).isEqualTo(3);
        assertThat(stock(VASE)).isEqualTo(25);
        // The outcome is final for the key: restocking does not change a replay.
        setStock(MUG, 25);
        var replay = guest.post("/checkout/guest", request, key);
        assertThat(replay.statusCode()).isEqualTo(409);
        assertThat(json(replay).get("shortages").get(0).get("available").asInt()).isEqualTo(3);
    }

    @Test
    void administratorsListOrdersAndProductsWithFilters() throws Exception {
        var admin = account(true);
        var shipped = buy(MUG, 1);
        var open = buy(VASE, 1);
        status(admin, shipped, "SHIPPED", null);

        var byStatus = json(admin.get("/admin/orders?status=shipped"));
        assertThat(ids(byStatus)).contains(shipped.get("id").asText()).doesNotContain(open.get("id").asText());
        var byNumber = json(admin.get("/admin/orders?q=" + open.get("orderNumber").asText().toLowerCase()));
        assertThat(ids(byNumber)).containsExactly(open.get("id").asText());
        var byEmail = json(admin.get("/admin/orders?q=" + open.get("contactEmail").asText().substring(0, 12)));
        assertThat(ids(byEmail)).contains(open.get("id").asText());
        assertThat(admin.get("/admin/orders?status=bogus").statusCode()).isEqualTo(400);
        assertThat(admin.get("/admin/orders?limit=0").statusCode()).isEqualTo(400);
        assertThat(admin.get("/admin/orders?limit=201").statusCode()).isEqualTo(400);

        var products = json(admin.get("/admin/products?limit=200"));
        assertThat(products.size()).isEqualTo(21);
        assertThat(products.get(0).has("stockQuantity")).isTrue();
        assertThat(json(admin.get("/admin/products?q=mug")).size()).isEqualTo(1);
    }

    List<String> ids(JsonNode orders) {
        var ids = new ArrayList<String>();
        orders.forEach(order -> ids.add(order.get("id").asText()));
        return ids;
    }

    /** Runs `count` calls at the same moment and returns their results. */
    <T> List<T> race(int count, ThrowingFunction<T> call) throws Exception {
        var pool = Executors.newFixedThreadPool(count);
        var ready = new CountDownLatch(count);
        var start = new CountDownLatch(1);
        var futures = new ArrayList<java.util.concurrent.Future<T>>();
        for (int i = 0; i < count; i++) {
            int index = i;
            Callable<T> task = () -> { ready.countDown(); start.await(); return call.apply(index); };
            futures.add(pool.submit(task));
        }
        ready.await();
        start.countDown();
        var results = new ArrayList<T>();
        for (var future : futures) results.add(future.get());
        pool.shutdown();
        return results;
    }

    interface ThrowingFunction<T> { T apply(int index) throws Exception; }
}
