package com.commerceflow.backend.error;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.UUID;
import org.slf4j.MDC;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
public class RequestCorrelationFilter extends OncePerRequestFilter {
    private static final String ATTRIBUTE = RequestCorrelationFilter.class.getName() + ".id";
    private final ObjectMapper mapper;

    public RequestCorrelationFilter(ObjectMapper mapper) { this.mapper = mapper; }

    public static String requestId(HttpServletRequest request) {
        if (request.getAttribute(ATTRIBUTE) instanceof String id) return id;
        String id = UUID.randomUUID().toString();
        request.setAttribute(ATTRIBUTE, id);
        return id;
    }

    @Override protected boolean shouldNotFilterAsyncDispatch() { return false; }
    @Override protected boolean shouldNotFilterErrorDispatch() { return false; }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        String previous = MDC.get("requestId");
        String id = requestId(request); // Never echo an untrusted inbound header.
        response.setHeader("X-Request-ID", id);
        MDC.put("requestId", id);
        try {
            chain.doFilter(request, response);
        } catch (RuntimeException | ServletException failure) {
            if (response.isCommitted()) {
                org.slf4j.LoggerFactory.getLogger(getClass()).error("Request failed after response commit requestId={}", id);
                throw new ServletException("Request failed after response commit; requestId=" + id);
            }
            response.resetBuffer();
            ApiProblemFactory.write(mapper, request, response, ApiProblemFactory.unexpected(failure));
        } catch (IOException transport) {
            org.slf4j.LoggerFactory.getLogger(getClass()).warn("Response transport failed requestId={}", id);
            throw new IOException("Response transport failed; requestId=" + id);
        } finally {
            if (previous == null) MDC.remove("requestId"); else MDC.put("requestId", previous);
        }
    }
}
