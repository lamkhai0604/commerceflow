package com.commerceflow.backend.error;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.DispatcherType;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.slf4j.MDC;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import static org.assertj.core.api.Assertions.*;

class RequestCorrelationFilterTest {
    final RequestCorrelationFilter filter = new RequestCorrelationFilter(new ObjectMapper());

    @Test
    void ignoresIncomingIdReusesDispatchIdAndClearsMdc() throws Exception {
        var request = new MockHttpServletRequest(); request.addHeader("X-Request-ID", "untrusted");
        var response = new MockHttpServletResponse();
        filter.doFilter(request, response, (req, res) -> assertThat(MDC.get("requestId")).isEqualTo(response.getHeader("X-Request-ID")));
        String id = response.getHeader("X-Request-ID"); UUID.fromString(id);
        assertThat(id).isNotEqualTo("untrusted"); assertThat(MDC.get("requestId")).isNull();
        request.setDispatcherType(DispatcherType.ERROR);
        filter.doFilter(request, response, (req, res) -> assertThat(MDC.get("requestId")).isEqualTo(id));
        assertThat(response.getHeader("X-Request-ID")).isEqualTo(id);
        assertThat(MDC.get("requestId")).isNull();
    }

    @Test
    void fallbackSanitizesFilterFailuresAndRestoresPreviousContext() throws Exception {
        MDC.put("requestId", "outer");
        try {
            var response = new MockHttpServletResponse();
            filter.doFilter(new MockHttpServletRequest(), response, (req, res) -> { throw new IllegalStateException("password=private"); });
            assertThat(response.getStatus()).isEqualTo(500);
            assertThat(response.getContentAsString()).contains("INTERNAL_ERROR").doesNotContain("password=private");
            assertThat(MDC.get("requestId")).isEqualTo("outer");
        } finally { MDC.clear(); }
    }

    @Test
    void committedResponseIsNotRewritten() throws Exception {
        var response = new MockHttpServletResponse(); response.getWriter().write("original"); response.flushBuffer();
        assertThatThrownBy(() -> filter.doFilter(new MockHttpServletRequest(), response,
                (req, res) -> { throw new IllegalStateException("private"); })).isInstanceOf(jakarta.servlet.ServletException.class).hasNoCause().hasMessageNotContaining("private");
        assertThat(response.getContentAsString()).isEqualTo("original");
        assertThat(MDC.get("requestId")).isNull();
    }

    @Test
    void restoresMdcWhenTransportCannotWriteResponse() {
        assertThatThrownBy(() -> filter.doFilter(new MockHttpServletRequest(), new MockHttpServletResponse(),
                (req, res) -> { throw new java.io.IOException("closed transport"); })).isInstanceOf(java.io.IOException.class);
        assertThat(MDC.get("requestId")).isNull();
    }
}
