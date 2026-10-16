FROM maven:3.9.9-eclipse-temurin-21 AS build
WORKDIR /workspace
COPY pom.xml .
RUN mvn -B dependency:go-offline
COPY src ./src
RUN mvn -B -DskipTests package
FROM eclipse-temurin:21.0.8_9-jre-alpine
RUN addgroup -S ams && adduser -S ams -G ams && apk add --no-cache curl
WORKDIR /app
COPY --from=build /workspace/target/asset-management-0.0.1-SNAPSHOT.jar app.jar
USER ams
EXPOSE 8080
HEALTHCHECK --interval=20s --timeout=5s --start-period=60s --retries=5 CMD curl -fsS http://localhost:8080/actuator/health || exit 1
ENTRYPOINT ["java","-jar","app.jar"]
