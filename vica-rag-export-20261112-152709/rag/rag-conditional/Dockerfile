# syntax=docker/dockerfile:1
# Build context MUST be the repo root (settings.gradle includes every module,
# and the Spring Boot / Arconia / Spring AI versions live in the root + buildSrc).

# ---------- build stage ----------
FROM eclipse-temurin:21-jdk AS build
WORKDIR /workspace

# Cache the Gradle distribution in its own layer
COPY gradlew ./
COPY gradle ./gradle
RUN chmod +x gradlew && ./gradlew --version

COPY . .
# gradle.properties sets -Xmx8g; override so the build fits on a small EC2 instance
RUN --mount=type=cache,target=/root/.gradle \
    ./gradlew :rag:rag-conditional:bootJar -x test --no-daemon \
      -Dorg.gradle.jvmargs="-Xmx1g"

# ---------- runtime stage ----------
FROM eclipse-temurin:21-jre
RUN useradd --system --uid 1001 app
WORKDIR /app
COPY --from=build /workspace/rag/rag-conditional/build/libs/*-SNAPSHOT.jar app.jar
USER app
EXPOSE 8080
ENV JAVA_TOOL_OPTIONS="-XX:MaxRAMPercentage=50"
ENTRYPOINT ["java", "-jar", "app.jar"]
