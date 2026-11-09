package com.commerceflow.backend.admin;

import com.commerceflow.backend.admin.AdminModels.AuditEntry;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Component;

/** Append-only record of administrative changes. Written in the same transaction as the change it describes. */
@Component
class AuditLog {
    private final JdbcClient jdbc;
    private final ObjectMapper json;

    AuditLog(JdbcClient jdbc, ObjectMapper json) {
        this.jdbc = jdbc;
        this.json = json;
    }

    void record(UUID actor, String action, String entityType, UUID entityId, String reason, Map<String, Object> details) {
        try {
            jdbc.sql("""
                    INSERT INTO commerceflow.admin_audit_log (id, actor_user_id, action, entity_type, entity_id, reason, details)
                    VALUES (:id, :actor, :action, :type, :entity, :reason, CAST(:details AS jsonb))""")
                    .param("id", UUID.randomUUID()).param("actor", actor).param("action", action).param("type", entityType)
                    .param("entity", entityId).param("reason", reason, java.sql.Types.VARCHAR)
                    .param("details", json.writeValueAsString(details)).update();
        } catch (JsonProcessingException e) {
            throw new IllegalStateException(e);
        }
    }

    List<AuditEntry> history(String entityType, UUID entityId) {
        return jdbc.sql("""
                SELECT a.id, u.email, a.action, a.reason, a.details::text AS details, a.created_at
                FROM commerceflow.admin_audit_log a JOIN commerceflow.users u ON u.id = a.actor_user_id
                WHERE a.entity_type = :type AND a.entity_id = :entity ORDER BY a.created_at, a.id""")
                .param("type", entityType).param("entity", entityId)
                .query((rs, row) -> {
                    try {
                        return new AuditEntry(rs.getObject("id", UUID.class), rs.getString("email"), rs.getString("action"),
                                rs.getString("reason"), json.readValue(rs.getString("details"), new TypeReference<Map<String, Object>>() {}),
                                rs.getTimestamp("created_at").toInstant());
                    } catch (JsonProcessingException e) {
                        throw new IllegalStateException(e);
                    }
                }).list();
    }
}
