# CommerceFlow API image for the hosted environment (S3-D01). Build context: backend/.
FROM eclipse-temurin:21-jdk-jammy AS build
WORKDIR /src
COPY .mvn .mvn
COPY mvnw pom.xml ./
RUN ./mvnw -B -q dependency:go-offline
COPY src src
# Tests run in CI against PostgreSQL; the image build only packages the verified source.
RUN ./mvnw -B -q -DskipTests package && cp target/backend-0.0.1-SNAPSHOT.jar /app.jar

FROM eclipse-temurin:21-jre-jammy
RUN useradd --system --uid 10001 --no-create-home app
COPY --from=build /app.jar /app/app.jar
USER app
# Sized for a 512 MB free instance: bounded heap, serial GC, smaller thread stacks.
ENV JAVA_TOOL_OPTIONS="-XX:MaxRAMPercentage=70 -XX:+UseSerialGC -Xss512k -XX:+ExitOnOutOfMemoryError" \
    SPRING_PROFILES_ACTIVE=prod
EXPOSE 8080
# Render provides PORT; SERVER_PORT keeps the local default of 8080.
ENTRYPOINT ["sh", "-c", "exec java -Dserver.port=${PORT:-${SERVER_PORT:-8080}} -jar /app/app.jar"]
