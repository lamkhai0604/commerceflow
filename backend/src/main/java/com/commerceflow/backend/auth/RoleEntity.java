package com.commerceflow.backend.auth;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

@Entity
@Table(name = "roles", schema = "commerceflow")
public class RoleEntity {
    @Id
    private Short id;
    @Column(nullable = false, unique = true, length = 20)
    private String name;

    protected RoleEntity() {}

    public String getName() { return name; }
}
