package com.commerceflow.backend.auth;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.session.SessionAuthenticationStrategy;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {
    private final AuthService service;
    private final AuthenticationManager authenticationManager;
    private final SessionAuthenticationStrategy strategy;
    private final HttpSessionSecurityContextRepository contexts;
    private final org.springframework.security.web.csrf.HttpSessionCsrfTokenRepository csrfRepository;

    public AuthController(AuthService service, AuthenticationManager authenticationManager,
            SessionAuthenticationStrategy strategy, HttpSessionSecurityContextRepository contexts,
            org.springframework.security.web.csrf.HttpSessionCsrfTokenRepository csrfRepository) {
        this.service = service;
        this.authenticationManager = authenticationManager;
        this.strategy = strategy;
        this.contexts = contexts;
        this.csrfRepository = csrfRepository;
    }

    @GetMapping("/csrf")
    public CsrfResponse csrf(CsrfToken token) {
        return new CsrfResponse(token.getHeaderName(), token.getToken());
    }

    @PostMapping("/register")
    @ResponseStatus(HttpStatus.CREATED)
    public UserProfile register(@Valid @RequestBody RegisterRequest request) {
        return service.register(request);
    }

    @PostMapping("/login")
    public UserProfile login(@Valid @RequestBody LoginRequest login, HttpServletRequest request, HttpServletResponse response) {
        var authentication = authenticationManager.authenticate(
                UsernamePasswordAuthenticationToken.unauthenticated(login.email(), login.password()));
        strategy.onAuthentication(authentication, request, response);
        var context = SecurityContextHolder.createEmptyContext();
        context.setAuthentication(authentication);
        SecurityContextHolder.setContext(context);
        contexts.saveContext(context, request, response);
        return UserProfile.from((AuthPrincipal) authentication.getPrincipal());
    }

    @PostMapping("/logout")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void logout(HttpServletRequest request, HttpServletResponse response) {
        var authentication = SecurityContextHolder.getContext().getAuthentication();
        csrfRepository.saveToken(null, request, response);
        new org.springframework.security.web.authentication.logout.SecurityContextLogoutHandler()
                .logout(request, response, authentication);
    }

    @GetMapping("/me")
    public UserProfile me(@AuthenticationPrincipal AuthPrincipal principal) {
        return UserProfile.from(principal);
    }

    public record CsrfResponse(String headerName, String token) {}
    public record LoginRequest(@jakarta.validation.constraints.NotBlank @jakarta.validation.constraints.Email
            @org.hibernate.validator.constraints.CodePointLength(max = 254) String email,
            @jakarta.validation.constraints.NotNull String password) {
        public LoginRequest { if (email != null) email = AuthService.normalizeEmail(email); }
        @Override public String toString() { return "LoginRequest[REDACTED]"; }
    }
}
