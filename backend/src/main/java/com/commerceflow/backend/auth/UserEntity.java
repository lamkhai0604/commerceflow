package com.commerceflow.backend.auth;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.HashSet;
import java.util.Set;
import java.util.UUID;

@Entity
@Table(name = "users", schema = "commerceflow")
public class UserEntity {
    @Id
    private UUID id;
    @Column(nullable = false, length = 254)
    private String email;
    @Column(name = "password_hash", nullable = false)
    private String passwordHash;
    @Column(name = "full_name", nullable = false, length = 50)
    private String fullName;
    @Column(name = "account_status", nullable = false, length = 20)
    private String accountStatus;
    @Column(name = "created_at", nullable = false)
    private Instant createdAt;
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;
    @ManyToMany(fetch = FetchType.EAGER)
    @JoinTable(name = "user_roles", schema = "commerceflow",
            joinColumns = @JoinColumn(name = "user_id"), inverseJoinColumns = @JoinColumn(name = "role_id"))
    private Set<RoleEntity> roles = new HashSet<>();

    protected UserEntity() {}

    public UserEntity(String email, String passwordHash, String fullName, RoleEntity role) {
        this.id = UUID.randomUUID();
        this.email = email;
        this.passwordHash = passwordHash;
        this.fullName = fullName;
        this.accountStatus = "ACTIVE";
        this.createdAt = Instant.now();
        this.updatedAt = createdAt;
        this.roles.add(role);
    }

    public UUID getId() { return id; }
    public String getEmail() { return email; }
    public String getPasswordHash() { return passwordHash; }
    public String getFullName() { return fullName; }
    public String getAccountStatus() { return accountStatus; }
    public Set<RoleEntity> getRoles() { return Set.copyOf(roles); }
}
