# Stage 1: build the React app into the Spring Boot static folder
FROM node:20-alpine AS frontend
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npx vite build --outDir /app/static --emptyOutDir

# Stage 2: build the jar with the React app bundled in
FROM maven:3.9-eclipse-temurin-21 AS backend
WORKDIR /app/backend
COPY backend/pom.xml ./
RUN mvn -q dependency:go-offline
COPY backend/src ./src
COPY --from=frontend /app/static ./src/main/resources/static
RUN mvn -q package -DskipTests

# Stage 3: small runtime image
FROM eclipse-temurin:21-jre
WORKDIR /app
COPY --from=backend /app/backend/target/lifetrack-backend-0.1.0.jar app.jar
ENV SPRING_PROFILES_ACTIVE=prod
EXPOSE 8080
# Render gives separate DB parts; build the JDBC url from them
CMD ["sh", "-c", "export DATABASE_URL=${DATABASE_URL:-jdbc:postgresql://$DB_HOST:$DB_PORT/$DB_NAME}; exec java -Dserver.port=${PORT:-8080} -jar app.jar"]
