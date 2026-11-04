package com.commerceflow.backend.migration;

import java.sql.DriverManager;
import java.util.UUID;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import static org.assertj.core.api.Assertions.*;

@Testcontainers
class RegistrationConstraintsMigrationTest {
    @Container final PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:17");

    Flyway migrations(String target) {
        var config = Flyway.configure().dataSource(postgres.getJdbcUrl(), postgres.getUsername(), postgres.getPassword());
        if (target != null) config.target(target);
        return config.load();
    }
    JdbcTemplate jdbc() { return new JdbcTemplate(new DriverManagerDataSource(postgres.getJdbcUrl(), postgres.getUsername(), postgres.getPassword())); }
    String email254() { return "a".repeat(64) + "@" + "b".repeat(63) + "." + "c".repeat(63) + "." + "d".repeat(61); }
    void seed(UUID id, String email, String name) {
        jdbc().update("INSERT INTO commerceflow.users (id,email,password_hash,full_name) VALUES (?,?,?,?)", id, email, "test-only-hash", name);
        jdbc().update("INSERT INTO commerceflow.user_roles (user_id,role_id) VALUES (?,1)",id);
    }
    int width(String column) {
        return jdbc().queryForObject("SELECT character_maximum_length FROM information_schema.columns WHERE table_schema='commerceflow' AND table_name='users' AND column_name=?",Integer.class,column);
    }

    @Test
    void freshInstallAppliesAllFourMigrations() {
        migrations(null).migrate();
        assertThat(width("email")).isEqualTo(254); assertThat(width("full_name")).isEqualTo(50);
        assertThat(jdbc().queryForObject("SELECT count(*) FROM public.flyway_schema_history WHERE success",Integer.class)).isEqualTo(4);
    }

    @Test
    void upgradesCompliantDataWithoutChangingIdentityRolesHashSessionsOrOldChecksums() {
        migrations("3").migrate();
        var checksums = jdbc().queryForList("SELECT version,checksum FROM public.flyway_schema_history ORDER BY installed_rank");
        UUID id=UUID.randomUUID(); String email=email254(), name="😀".repeat(50); seed(id,email,name);
        String session=UUID.randomUUID().toString();
        jdbc().update("INSERT INTO commerceflow.spring_session (primary_id,session_id,creation_time,last_access_time,max_inactive_interval,expiry_time,principal_name) VALUES (?,?,0,0,1800,1800000,?)",session,session,email);
        migrations(null).migrate();
        assertThat(width("email")).isEqualTo(254); assertThat(width("full_name")).isEqualTo(50);
        assertThat(jdbc().queryForObject("SELECT full_name FROM commerceflow.users WHERE id=?",String.class,id)).isEqualTo(name);
        assertThat(jdbc().queryForObject("SELECT email FROM commerceflow.users WHERE id=?",String.class,id)).isEqualTo(email);
        assertThat(jdbc().queryForObject("SELECT password_hash FROM commerceflow.users WHERE id=?",String.class,id)).isEqualTo("test-only-hash");
        assertThat(jdbc().queryForObject("SELECT count(*) FROM commerceflow.user_roles WHERE user_id=?",Integer.class,id)).isEqualTo(1);
        assertThat(jdbc().queryForObject("SELECT principal_name FROM commerceflow.spring_session WHERE primary_id=?",String.class,session)).isEqualTo(email);
        assertThat(jdbc().queryForObject("SELECT count(*) FROM pg_indexes WHERE schemaname='commerceflow' AND indexname='users_email_unique'",Integer.class)).isEqualTo(1);
        assertThat(jdbc().queryForList("SELECT version,checksum FROM public.flyway_schema_history WHERE version IN ('1','2','3') ORDER BY installed_rank")).isEqualTo(checksums);
        assertThatThrownBy(() -> seed(UUID.randomUUID(),email,"Other"))
                .isInstanceOf(org.springframework.dao.DataIntegrityViolationException.class);
        assertThatThrownBy(() -> seed(UUID.randomUUID(),"other@example.com","😀".repeat(51)))
                .isInstanceOf(org.springframework.dao.DataIntegrityViolationException.class);
    }

    @Test
    void overLimitRecordsAbortMigrationWithOnlyCountsAndLeaveDataAndSchemaUntouched() {
        migrations("3").migrate();
        UUID id=UUID.randomUUID(); String email="a".repeat(243)+"@example.com", name="😀".repeat(51);
        seed(id,email,name);
        assertThatThrownBy(() -> migrations(null).migrate()).satisfies(failure -> {
            String message=failure.getMessage();
            assertThat(message).contains("fullName_over_limit=1", "email_over_limit=1")
                    .doesNotContain(email,name,"test-only-hash");
        });
        assertThat(width("email")).isEqualTo(320); assertThat(width("full_name")).isEqualTo(150);
        assertThat(jdbc().queryForObject("SELECT email FROM commerceflow.users WHERE id=?",String.class,id)).isEqualTo(email);
        assertThat(jdbc().queryForObject("SELECT full_name FROM commerceflow.users WHERE id=?",String.class,id)).isEqualTo(name);
        assertThat(jdbc().queryForObject("SELECT count(*) FROM commerceflow.user_roles WHERE user_id=?",Integer.class,id)).isEqualTo(1);
        assertThat(jdbc().queryForObject("SELECT count(*) FROM public.flyway_schema_history WHERE version='4'",Integer.class)).isZero();
        migrations("3").validate();
    }
}
