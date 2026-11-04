package com.commerceflow.backend.auth;

import java.util.Set;
import java.util.UUID;

public record UserProfile(UUID id, String email, String fullName, Set<String> roles) {
    public static UserProfile from(AuthPrincipal principal) {
        return new UserProfile(principal.id(), principal.getUsername(), principal.fullName(), principal.roles());
    }
}
