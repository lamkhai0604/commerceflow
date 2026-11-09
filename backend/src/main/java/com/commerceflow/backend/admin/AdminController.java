package com.commerceflow.backend.admin;

import com.commerceflow.backend.admin.AdminModels.AdminOrder;
import com.commerceflow.backend.admin.AdminModels.AdminProduct;
import com.commerceflow.backend.admin.AdminModels.InventoryRequest;
import com.commerceflow.backend.admin.AdminModels.OrderStatus;
import com.commerceflow.backend.admin.AdminModels.ProductPatchRequest;
import com.commerceflow.backend.admin.AdminModels.StatusChangeRequest;
import com.commerceflow.backend.auth.AuthPrincipal;
import com.commerceflow.backend.commerce.CommerceModels.Order;
import com.commerceflow.backend.error.ApiProblemFactory;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import java.util.List;
import java.util.UUID;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

/** Administration endpoints. The ADMIN role is required by the security configuration for everything under /api/v1/admin. */
@RestController
@RequestMapping("/api/v1/admin")
public class AdminController {
    private static final int MAX_LIMIT = 200;

    private final AdminOrderService orders;
    private final AdminProductService products;

    public AdminController(AdminOrderService orders, AdminProductService products) {
        this.orders = orders;
        this.products = products;
    }

    @GetMapping("/orders")
    public List<Order> orders(@RequestParam(required = false) String status, @RequestParam(required = false) String q,
            @RequestParam(defaultValue = "100") int limit) {
        return orders.list(status(status), search(q), limit(limit));
    }

    @GetMapping("/orders/{orderId}")
    public AdminOrder order(@PathVariable UUID orderId) {
        return orders.detail(orderId);
    }

    @PatchMapping("/orders/{orderId}/status")
    public AdminOrder changeStatus(@AuthenticationPrincipal AuthPrincipal admin, @PathVariable UUID orderId,
            @Valid @RequestBody StatusChangeRequest request) {
        return orders.changeStatus(admin.id(), orderId, request.status(), request.reason());
    }

    @GetMapping("/products")
    public List<AdminProduct> products(@RequestParam(required = false) String q, @RequestParam(defaultValue = "100") int limit) {
        return products.list(search(q), limit(limit));
    }

    @PatchMapping("/products/{productId}")
    public AdminProduct patch(@AuthenticationPrincipal AuthPrincipal admin, @PathVariable UUID productId,
            @Valid @RequestBody ProductPatchRequest request) {
        return products.patch(admin.id(), productId, request);
    }

    @PatchMapping("/products/{productId}/inventory")
    public AdminProduct inventory(@AuthenticationPrincipal AuthPrincipal admin, @PathVariable UUID productId,
            @Valid @RequestBody InventoryRequest request) {
        return products.setStock(admin.id(), productId, request);
    }

    private static OrderStatus status(String value) {
        if (value == null || value.isBlank()) return null;
        try {
            return OrderStatus.valueOf(value.strip().toUpperCase(java.util.Locale.ROOT));
        } catch (IllegalArgumentException e) {
            throw new AdminException.InvalidRequest();
        }
    }

    private static String search(String value) {
        if (value == null || value.isBlank()) return null;
        if (value.strip().length() > 120) throw new AdminException.InvalidRequest();
        return value.strip();
    }

    private static int limit(int value) {
        if (value < 1 || value > MAX_LIMIT) throw new AdminException.InvalidRequest();
        return value;
    }

    @ExceptionHandler(AdminException.class)
    ResponseEntity<ProblemDetail> handle(AdminException failure, HttpServletRequest request) {
        return ApiProblemFactory.response(failure.code(), request);
    }
}
