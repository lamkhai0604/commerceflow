package com.commerceflow.backend.auth;

import com.commerceflow.backend.error.ApiProblemFactory;
import com.commerceflow.backend.error.ErrorCode;
import jakarta.servlet.http.HttpServletRequest;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.authentication.AccountStatusException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class AuthExceptionHandler {
    @ExceptionHandler(AuthService.EmailConflictException.class)
    ResponseEntity<ProblemDetail> conflict(HttpServletRequest request) {
        return ApiProblemFactory.response(ErrorCode.EMAIL_CONFLICT, request);
    }

    @ExceptionHandler({BadCredentialsException.class, AccountStatusException.class, UsernameNotFoundException.class})
    ResponseEntity<ProblemDetail> credentials(HttpServletRequest request) {
        return ApiProblemFactory.response(ErrorCode.INVALID_CREDENTIALS, request);
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    ResponseEntity<ProblemDetail> validation(MethodArgumentNotValidException exception, HttpServletRequest request) {
        var problem = ApiProblemFactory.problem(ErrorCode.VALIDATION_ERROR, request);
        var errors = new LinkedHashMap<String, String>();
        var fields = new ArrayList<Map<String, String>>();
        exception.getBindingResult().getFieldErrors().forEach(error -> {
            if (!java.util.Set.of("email", "password", "fullName").contains(error.getField())) return;
            String code = switch (error.getCode() == null ? "" : error.getCode()) {
                case "NotNull", "NotBlank" -> "REQUIRED";
                case "Email" -> "INVALID_FORMAT";
                default -> "INVALID_VALUE";
            };
            errors.putIfAbsent(error.getField(), switch (code) {
                case "REQUIRED" -> "This field is required";
                case "INVALID_FORMAT" -> "Enter a valid email address";
                default -> "This field does not meet the documented constraints";
            });
            fields.add(Map.of("field", error.getField(), "code", code));
        });
        problem.setProperty("errors", errors);
        problem.setProperty("fieldErrors", fields);
        return ResponseEntity.badRequest().headers(ApiProblemFactory.headers(request)).body(problem);
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    ResponseEntity<ProblemDetail> malformed(HttpServletRequest request) {
        return ApiProblemFactory.response(ErrorCode.INVALID_REQUEST, request);
    }

    @ExceptionHandler(org.springframework.web.HttpRequestMethodNotSupportedException.class)
    ResponseEntity<ProblemDetail> method(org.springframework.web.HttpRequestMethodNotSupportedException failure,
            HttpServletRequest request) {
        var headers = ApiProblemFactory.headers(request);
        if (failure.getSupportedHttpMethods() != null) headers.setAllow(failure.getSupportedHttpMethods());
        return ResponseEntity.status(405).headers(headers).body(ApiProblemFactory.problem(ErrorCode.METHOD_NOT_ALLOWED, request));
    }

    @ExceptionHandler(org.springframework.web.HttpMediaTypeNotSupportedException.class)
    ResponseEntity<ProblemDetail> media(HttpServletRequest request) {
        return ApiProblemFactory.response(ErrorCode.UNSUPPORTED_MEDIA_TYPE, request);
    }

    @ExceptionHandler(org.springframework.security.access.AccessDeniedException.class)
    ResponseEntity<ProblemDetail> denied(HttpServletRequest request) {
        return ApiProblemFactory.response(ErrorCode.ACCESS_DENIED, request);
    }

    @ExceptionHandler(Exception.class)
    ResponseEntity<ProblemDetail> unexpected(Exception failure, HttpServletRequest request) throws Exception {
        // Preserve unmodeled framework protocol statuses (e.g. 404/406), not false 500s.
        if (failure instanceof org.springframework.web.ErrorResponse) throw failure;
        return ApiProblemFactory.response(ApiProblemFactory.unexpected(failure), request);
    }
}
