package com.commerceflow.backend.error;

import java.sql.SQLException;
import org.hibernate.exception.ConstraintViolationException;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.springframework.dao.DataIntegrityViolationException;
import static org.assertj.core.api.Assertions.assertThat;

class DatabaseConstraintClassifierTest {
    @ParameterizedTest
    @CsvSource({"23505,users_email_unique,true", "23505,users_pkey,false", "23503,user_roles_role_id_fkey,false",
            "23514,users_email_normalized,false", "23502,password_hash,false", "22001,full_name,false",
            "23505,,false", ",users_email_unique,false"})
    void requiresBothExactMetadata(String state, String constraint, boolean expected) {
        var failure = new DataIntegrityViolationException("private diagnostic",
                new ConstraintViolationException("ignored", new SQLException("ignored", state), constraint));
        assertThat(DatabaseConstraintClassifier.isEmailUniqueViolation(failure)).isEqualTo(expected);
    }

    @Test
    void doesNotParseMessagesOrGuessFromSqlState() {
        assertThat(DatabaseConstraintClassifier.isEmailUniqueViolation(
                new SQLException("23505 users_email_unique", "23505"))).isFalse();
        assertThat(DatabaseConstraintClassifier.isEmailUniqueViolation(new RuntimeException("users_email_unique"))).isFalse();
    }

    @Test
    void traversesWrappersAndRejectsContradictionsAndUnboundedChains() {
        var sql = new SQLException("private", "23505");
        var known = new ConstraintViolationException("private", sql, "users_email_unique");
        assertThat(DatabaseConstraintClassifier.isEmailUniqueViolation(new RuntimeException(known))).isTrue();
        sql.setNextException(new SQLException("other failure", "23503"));
        assertThat(DatabaseConstraintClassifier.isEmailUniqueViolation(known)).isFalse();
        Throwable chain = new ConstraintViolationException("private", new SQLException("private", "23505"), "users_email_unique");
        for (int n = 0; n < 40; n++) chain = new RuntimeException(chain);
        assertThat(DatabaseConstraintClassifier.isEmailUniqueViolation(chain)).isFalse();
        var a = new RuntimeException(); var b = new RuntimeException(a); a.initCause(b);
        assertThat(DatabaseConstraintClassifier.isEmailUniqueViolation(a)).isFalse();
    }

    @Test
    void onlyPositivelyKnownAvailabilityFailuresAre503() {
        assertThat(ApiProblemFactory.unexpected(new RuntimeException(new SQLException("private", "08006"))))
                .isEqualTo(ErrorCode.SERVICE_UNAVAILABLE);
        assertThat(ApiProblemFactory.unexpected(new java.sql.SQLTransientConnectionException("private", "08004")))
                .isEqualTo(ErrorCode.INTERNAL_ERROR);
        for (String state : new String[]{"23505", "42P01", "08004", "40001"}) {
            assertThat(ApiProblemFactory.unexpected(new SQLException("private", state))).isEqualTo(ErrorCode.INTERNAL_ERROR);
        }
    }
}
