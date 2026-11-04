package com.commerceflow.backend.auth;

import java.util.Locale;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuthService implements UserDetailsService {
    private final UserRepository users;
    private final RoleRepository roles;
    private final PasswordEncoder passwords;

    public AuthService(UserRepository users, RoleRepository roles, PasswordEncoder passwords) {
        this.users = users;
        this.roles = roles;
        this.passwords = passwords;
    }

    public static String normalizeEmail(String email) {
        return email.strip().toLowerCase(Locale.ROOT);
    }

    @Transactional
    public UserProfile register(RegisterRequest request) {
        String email = normalizeEmail(request.email());
        if (users.existsByEmail(email)) throw new EmailConflictException();
        var customer = roles.findByName("CUSTOMER").orElseThrow(() -> new IllegalStateException("Customer role unavailable"));
        UserEntity user;
        try {
            user = users.saveAndFlush(new UserEntity(email, passwords.encode(request.password()), request.fullName(), customer));
        } catch (org.springframework.dao.DataIntegrityViolationException failure) {
            if (com.commerceflow.backend.error.DatabaseConstraintClassifier.isEmailUniqueViolation(failure)) {
                throw new EmailConflictException();
            }
            throw failure; // Unchecked failure exits the transactional boundary and rolls back.
        }
        return UserProfile.from(new AuthPrincipal(user));
    }

    @Override
    @Transactional(readOnly = true)
    public UserDetails loadUserByUsername(String email) {
        return users.findByEmail(normalizeEmail(email)).map(AuthPrincipal::new)
                .orElseThrow(() -> new UsernameNotFoundException("Invalid credentials"));
    }

    public static final class EmailConflictException extends RuntimeException {}
}
