package com.commerceflow.backend.error;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.net.URI;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;

public final class ApiProblemFactory {
    private static final org.slf4j.Logger LOG = org.slf4j.LoggerFactory.getLogger(ApiProblemFactory.class);
    private ApiProblemFactory() {}

    public static ErrorCode unexpected(Throwable failure) {
        return DatabaseConstraintClassifier.isTemporaryUnavailable(failure)
                ? ErrorCode.SERVICE_UNAVAILABLE : ErrorCode.INTERNAL_ERROR;
    }

    public static ProblemDetail problem(ErrorCode code, HttpServletRequest request) {
        String id = RequestCorrelationFilter.requestId(request);
        var problem = ProblemDetail.forStatusAndDetail(org.springframework.http.HttpStatusCode.valueOf(code.status), code.detail);
        problem.setTitle(code.title);
        problem.setInstance(URI.create("urn:uuid:" + id));
        problem.setProperty("code", code.name());
        problem.setProperty("requestId", id);
        if (code.status >= 500) LOG.error("Request failed code={} requestId={}", code, id);
        else LOG.info("Request rejected code={} requestId={}", code, id);
        return problem;
    }

    public static ResponseEntity<ProblemDetail> response(ErrorCode code, HttpServletRequest request) {
        return ResponseEntity.status(code.status).headers(headers(request)).body(problem(code, request));
    }

    public static HttpHeaders headers(HttpServletRequest request) {
        var headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_PROBLEM_JSON);
        headers.setCacheControl("no-store");
        headers.set("X-Request-ID", RequestCorrelationFilter.requestId(request));
        return headers;
    }

    public static void write(ObjectMapper mapper, HttpServletRequest request,
            HttpServletResponse response, ErrorCode code) throws IOException {
        response.setStatus(code.status);
        response.setContentType(MediaType.APPLICATION_PROBLEM_JSON_VALUE);
        response.setHeader("Cache-Control", "no-store");
        response.setHeader("X-Request-ID", RequestCorrelationFilter.requestId(request));
        mapper.writeValue(response.getOutputStream(), problem(code, request));
    }
}
