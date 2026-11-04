package com.commerceflow.backend.auth;

import java.io.Serial;
import java.io.Serializable;
import java.util.Collection;
import java.util.Set;
import java.util.UUID;
import org.springframework.security.core.CredentialsContainer;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

public final class AuthPrincipal implements UserDetails, CredentialsContainer, Serializable {
    @Serial
    private static final long serialVersionUID = 1L;
    private final UUID id;
    private final String email;
    private final String fullName;
    private final Set<String> roles;
    private final boolean enabled;
    private transient String passwordHash;

    public AuthPrincipal(UserEntity user) {
        id = user.getId();
        email = user.getEmail();
        fullName = user.getFullName();
        roles = user.getRoles().stream().map(RoleEntity::getName).collect(java.util.stream.Collectors.toUnmodifiableSet());
        enabled = "ACTIVE".equals(user.getAccountStatus());
        passwordHash = user.getPasswordHash();
    }

    public UUID id() { return id; }
    public String fullName() { return fullName; }
    public Set<String> roles() { return roles; }
    @Override public String getUsername() { return email; }
    @Override public String getPassword() { return passwordHash; }
    @Override public boolean isEnabled() { return enabled; }
    @Override public Collection<SimpleGrantedAuthority> getAuthorities() {
        return roles.stream().map(role -> new SimpleGrantedAuthority("ROLE_" + role)).toList();
    }
    @Override public void eraseCredentials() { passwordHash = null; }
}
