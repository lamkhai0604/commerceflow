package com.commerceflow.backend.commerce;

import com.commerceflow.backend.auth.AuthPrincipal;
import com.commerceflow.backend.commerce.CommerceModels.AddCartItemRequest;
import com.commerceflow.backend.commerce.CommerceModels.Cart;
import com.commerceflow.backend.commerce.CommerceModels.GuestCheckoutRequest;
import com.commerceflow.backend.commerce.CommerceModels.MemberCheckoutRequest;
import com.commerceflow.backend.commerce.CommerceModels.MergeCartRequest;
import com.commerceflow.backend.commerce.CommerceModels.MergeCartResponse;
import com.commerceflow.backend.commerce.CommerceModels.Order;
import com.commerceflow.backend.commerce.CommerceModels.OrderLookupRequest;
import com.commerceflow.backend.commerce.CommerceModels.UpdateCartItemRequest;
import com.commerceflow.backend.error.ApiProblemFactory;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import java.nio.charset.StandardCharsets;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.HexFormat;
import java.util.List;
import java.util.UUID;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

/**
 * Cart, checkout and order endpoints (OpenAPI v1.3 orders). Member routes require the CUSTOMER role (security
 * configuration); guest checkout and order lookup are public but still require the CSRF token, like every write.
 */
@RestController
@RequestMapping("/api/v1")
public class CommerceController {
    static final int LOOKUP_LIMIT = 10;
    static final long LOOKUP_WINDOW_MS = 10 * 60 * 1000L;
    private static final String LOOKUP_ATTEMPTS = CommerceController.class.getName() + ".lookupAttempts";

    private final CartService carts;
    private final CheckoutService checkout;
    private final OrderQueries orders;
    private final com.fasterxml.jackson.databind.ObjectMapper mapper;

    public CommerceController(CartService carts, CheckoutService checkout, OrderQueries orders,
            com.fasterxml.jackson.databind.ObjectMapper mapper) {
        this.carts = carts;
        this.checkout = checkout;
        this.orders = orders;
        this.mapper = mapper;
    }

    // Member cart

    @GetMapping("/cart")
    public Cart cart(@AuthenticationPrincipal AuthPrincipal principal) {
        return carts.cart(principal.id());
    }

    @PostMapping("/cart/items")
    public Cart add(@AuthenticationPrincipal AuthPrincipal principal, @Valid @RequestBody AddCartItemRequest request) {
        return carts.add(principal.id(), request.productId(), request.quantity());
    }

    @PatchMapping("/cart/items/{itemId}")
    public Cart update(@AuthenticationPrincipal AuthPrincipal principal, @PathVariable UUID itemId,
            @Valid @RequestBody UpdateCartItemRequest request) {
        return carts.setQuantity(principal.id(), itemId, request.quantity());
    }

    @DeleteMapping("/cart/items/{itemId}")
    public Cart remove(@AuthenticationPrincipal AuthPrincipal principal, @PathVariable UUID itemId) {
        return carts.remove(principal.id(), itemId);
    }

    @PostMapping("/cart/merge")
    public MergeCartResponse merge(@AuthenticationPrincipal AuthPrincipal principal, @Valid @RequestBody MergeCartRequest request) {
        return carts.merge(principal.id(), request.items());
    }

    // Checkout

    @PostMapping("/orders")
    public ResponseEntity<String> memberCheckout(@AuthenticationPrincipal AuthPrincipal principal, HttpServletRequest http,
            @RequestHeader(value = "Idempotency-Key", required = false) String key, @Valid @RequestBody MemberCheckoutRequest request) {
        var buyer = new CheckoutService.Buyer(principal.id(), principal.getUsername(), null, null);
        return respond(checkout.checkout(buyer, key, request.shippingAddress(), request.deliveryMethod(), request.paymentScenario()), http);
    }

    @PostMapping("/checkout/guest")
    public ResponseEntity<String> guestCheckout(@AuthenticationPrincipal AuthPrincipal principal, HttpServletRequest http,
            @RequestHeader(value = "Idempotency-Key", required = false) String key, @Valid @RequestBody GuestCheckoutRequest request) {
        // Signed-in customers buy from their server cart through POST /orders.
        if (principal != null) throw new CommerceException.GuestOnly();
        var buyer = new CheckoutService.Buyer(null, request.email(), sessionHash(http), request.items());
        return respond(checkout.checkout(buyer, key, request.shippingAddress(), request.deliveryMethod(), request.paymentScenario()), http);
    }

    // Orders

    @GetMapping("/orders")
    public List<Order> orders(@AuthenticationPrincipal AuthPrincipal principal) {
        return orders.forUser(principal.id());
    }

    @GetMapping("/orders/{orderId}")
    public Order order(@AuthenticationPrincipal AuthPrincipal principal, @PathVariable UUID orderId) {
        return orders.forUser(principal.id(), orderId).orElseThrow(CommerceException.NotFound::new);
    }

    @PostMapping("/orders/lookup")
    public Order lookup(HttpServletRequest http, @Valid @RequestBody OrderLookupRequest request) {
        countLookup(http);
        return orders.lookup(request.orderNumber(), request.email()).orElseThrow(CommerceException.NotFound::new);
    }

    private ResponseEntity<String> respond(CheckoutService.Outcome outcome, HttpServletRequest http) {
        var headers = new HttpHeaders();
        headers.setContentType(outcome.status() == 201 ? MediaType.APPLICATION_JSON : MediaType.APPLICATION_PROBLEM_JSON);
        headers.setCacheControl("no-store");
        if (outcome.replayed()) headers.set("Idempotent-Replayed", "true");
        String body = outcome.body();
        if (outcome.status() != 201) {
            // Stored problem outcomes carry this request's correlation ID, like every other problem response (CR-04).
            try {
                var problem = (com.fasterxml.jackson.databind.node.ObjectNode) mapper.readTree(body);
                String id = com.commerceflow.backend.error.RequestCorrelationFilter.requestId(http);
                problem.put("instance", "urn:uuid:" + id);
                problem.put("requestId", id);
                body = mapper.writeValueAsString(problem);
            } catch (com.fasterxml.jackson.core.JsonProcessingException e) {
                throw new IllegalStateException(e);
            }
        }
        return ResponseEntity.status(outcome.status()).headers(headers).body(body);
    }

    /** A guest's idempotency scope: a hash of the session ID, so the raw session ID is never stored. */
    private static String sessionHash(HttpServletRequest http) {
        String id = http.getSession(true).getId();
        return HexFormat.of().formatHex(CheckoutService.sha256(id.getBytes(StandardCharsets.UTF_8)));
    }

    /** At most ten lookups per session in ten minutes, to slow down guessing of order numbers. */
    private static void countLookup(HttpServletRequest http) {
        var session = http.getSession(true);
        long now = System.currentTimeMillis();
        // Approximate under concurrent requests from one session, which is enough to slow down guessing.
        @SuppressWarnings("unchecked")
        Deque<Long> attempts = session.getAttribute(LOOKUP_ATTEMPTS) instanceof Deque<?> d ? (Deque<Long>) d : new ArrayDeque<>();
        while (!attempts.isEmpty() && now - attempts.peekFirst() > LOOKUP_WINDOW_MS) attempts.pollFirst();
        if (attempts.size() >= LOOKUP_LIMIT) throw new CommerceException.TooManyRequests();
        attempts.addLast(now);
        session.setAttribute(LOOKUP_ATTEMPTS, attempts);
    }

    @ExceptionHandler(CommerceException.class)
    ResponseEntity<ProblemDetail> handle(CommerceException failure, HttpServletRequest request) {
        var response = ApiProblemFactory.response(failure.code(), request);
        if (failure instanceof CommerceException.InProgress) {
            return ResponseEntity.status(response.getStatusCode()).headers(h -> { h.addAll(response.getHeaders()); h.set("Retry-After", "2"); })
                    .body(response.getBody());
        }
        if (failure instanceof CommerceException.PaymentUnavailable) {
            return ResponseEntity.status(response.getStatusCode()).headers(h -> { h.addAll(response.getHeaders()); h.set("Retry-After", "5"); })
                    .body(response.getBody());
        }
        return response;
    }
}
