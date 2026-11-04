package com.commerceflow.backend.error;

import java.sql.SQLException;
import java.sql.SQLTransientConnectionException;
import java.util.ArrayDeque;
import java.util.Collections;
import java.util.IdentityHashMap;
import java.util.Set;
import java.util.function.Predicate;
import org.hibernate.exception.ConstraintViolationException;

public final class DatabaseConstraintClassifier {
    private DatabaseConstraintClassifier() {}

    // Call only at the registration write boundary. Names/messages alone never suffice.
    public static boolean isEmailUniqueViolation(Throwable failure) {
        boolean[] verified = {false};
        boolean[] contradictory = {false};
        boolean complete = visit(failure, item -> {
            if (item instanceof ConstraintViolationException constraint) {
                if ("23505".equals(constraint.getSQLState())
                        && "users_email_unique".equals(constraint.getConstraintName())) verified[0] = true;
                else contradictory[0] = true;
            }
            if (item instanceof SQLException sql && sql.getSQLState() != null
                    && !"23505".equals(sql.getSQLState())) contradictory[0] = true;
            return false;
        });
        return complete && verified[0] && !contradictory[0];
    }

    public static boolean isTemporaryUnavailable(Throwable failure) {
        boolean[] unavailable = {false};
        boolean[] contradictory = {false};
        boolean complete = visit(failure, item -> {
            if (item instanceof SQLException sql) {
                String state = sql.getSQLState();
                if (Set.of("08001", "08006").contains(state == null ? "" : state)
                        || item instanceof SQLTransientConnectionException && state == null) unavailable[0] = true;
                else if (state != null) contradictory[0] = true;
            }
            return false;
        });
        return complete && unavailable[0] && !contradictory[0];
    }

    private static boolean visit(Throwable root, Predicate<Throwable> visitor) {
        if (root == null) return true;
        var queue = new ArrayDeque<Throwable>();
        var seen = Collections.newSetFromMap(new IdentityHashMap<Throwable, Boolean>());
        queue.add(root);
        while (!queue.isEmpty()) {
            var item = queue.removeFirst();
            if (!seen.add(item)) continue;
            if (seen.size() > 32) return false;
            visitor.test(item);
            if (item.getCause() != null) queue.addLast(item.getCause());
            if (item instanceof SQLException sql && sql.getNextException() != null) queue.addLast(sql.getNextException());
        }
        return true;
    }
}
