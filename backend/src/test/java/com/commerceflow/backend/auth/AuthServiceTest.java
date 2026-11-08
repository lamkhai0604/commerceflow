package com.commerceflow.backend.auth;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.password.PasswordEncoder;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {
    @Mock UserRepository users;
    @Mock RoleRepository roles;
    @Mock PasswordEncoder encoder;
    private AuthService service;

    @BeforeEach
    void setup() { service = new AuthService(users, roles, encoder); }

    @Test
    void normalizesEmailAndPersistsOnlyEncodedPasswordWithCustomerRole() {
        var role = mock(RoleEntity.class);
        when(role.getName()).thenReturn("CUSTOMER");
        when(roles.findByName("CUSTOMER")).thenReturn(Optional.of(role));
        when(encoder.encode("long-test-password")).thenReturn("encoded-hash");
        when(users.saveAndFlush(any())).thenAnswer(invocation -> invocation.getArgument(0));
        var profile = service.register(new RegisterRequest("  Alice@EXAMPLE.COM  ", "long-test-password", "Alice"));
        var saved = ArgumentCaptor.forClass(UserEntity.class);
        verify(users).saveAndFlush(saved.capture());
        assertThat(saved.getValue().getPasswordHash()).isEqualTo("encoded-hash");
        assertThat(profile.email()).isEqualTo("alice@example.com");
        assertThat(profile.roles()).containsExactly("CUSTOMER");
        assertThat(profile.toString()).doesNotContain("long-test-password", "encoded-hash");
    }

    @Test
    void rejectsDuplicateBeforeHashing() {
        when(users.existsByEmail("alice@example.com")).thenReturn(true);
        assertThatThrownBy(() -> service.register(new RegisterRequest("Alice@example.com", "long-test-password", "Alice")))
                .isInstanceOf(AuthService.EmailConflictException.class);
        verifyNoInteractions(encoder, roles);
        verify(users, never()).saveAndFlush(any());
    }

    @Test
    void passwordEncoderUsesSaltAndSupportsLongUnicodePasswords() {
        var passwords = new SecurityConfiguration().passwordEncoder();
        String password = "密碼🔐".repeat(20);
        var first = passwords.encode(password);
        var second = passwords.encode(password);
        assertThat(first).isNotEqualTo(second).doesNotContain(password);
        assertThat(passwords.matches(password, first)).isTrue();
        assertThat(passwords.matches(password + "x", first)).isFalse();
    }

    @Test
    void credentialRequestsDoNotExposePasswordsInToString() {
        assertThat(new RegisterRequest("test@example.com", "secret-password", "Test").toString()).doesNotContain("secret-password");
        assertThat(new AuthController.LoginRequest("test@example.com", "secret-password").toString()).doesNotContain("secret-password");
    }
}
