package com.commerceflow.backend.auth;

import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** The signed-in customer's own profile (OpenAPI baseline `/account/profile`); the CUSTOMER role is required by the security configuration. */
@RestController
@RequestMapping("/api/v1/account")
public class AccountController {
    @GetMapping("/profile")
    public UserProfile profile(@AuthenticationPrincipal AuthPrincipal principal) {
        return UserProfile.from(principal);
    }
}
