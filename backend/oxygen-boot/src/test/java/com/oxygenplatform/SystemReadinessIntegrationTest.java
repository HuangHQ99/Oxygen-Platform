package com.oxygenplatform;

import static org.assertj.core.api.Assertions.assertThat;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.Duration;
import javax.sql.DataSource;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.jdbc.core.JdbcTemplate;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

@Testcontainers
@SpringBootTest(
    webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
    properties = "spring.datasource.hikari.connection-timeout=1000")
class SystemReadinessIntegrationTest {

  private static final Duration REQUEST_TIMEOUT = Duration.ofSeconds(5);
  private static final Duration READINESS_TIMEOUT = Duration.ofSeconds(15);

  @Container @ServiceConnection
  static final PostgreSQLContainer<?> POSTGRES =
      new PostgreSQLContainer<>("postgres:17.7-alpine");

  @Autowired private DataSource dataSource;

  @LocalServerPort private int serverPort;

  @Test
  void healthEndpointsReflectDatabaseAvailability() throws Exception {
    JdbcTemplate jdbc = new JdbcTemplate(dataSource);
    Integer baselineCount =
        jdbc.queryForObject("SELECT count(*) FROM platform_baseline", Integer.class);

    assertThat(baselineCount).isEqualTo(1);
    assertThat(databaseProduct()).isEqualTo("PostgreSQL");

    assertUp("/api/v1/system/info");
    assertUp("/actuator/health/liveness");
    assertUp("/actuator/health/readiness");

    POSTGRES.stop();

    HttpResponse<String> unavailable = awaitStatus("/actuator/health/readiness", 503);
    assertThat(unavailable.body()).contains("\"status\":\"DOWN\"");
    assertUp("/actuator/health/liveness");
  }

  private void assertUp(String path) throws IOException, InterruptedException {
    HttpResponse<String> response = get(path);
    assertThat(response.statusCode()).isEqualTo(200);
    assertThat(response.body()).contains("\"status\":\"UP\"");
  }

  private HttpResponse<String> awaitStatus(String path, int expectedStatus)
      throws IOException, InterruptedException {
    long deadline = System.nanoTime() + READINESS_TIMEOUT.toNanos();
    HttpResponse<String> latest = get(path);

    while (latest.statusCode() != expectedStatus && System.nanoTime() < deadline) {
      Thread.sleep(200);
      latest = get(path);
    }

    assertThat(latest.statusCode()).isEqualTo(expectedStatus);
    return latest;
  }

  private HttpResponse<String> get(String path) throws IOException, InterruptedException {
    HttpRequest request =
        HttpRequest.newBuilder()
            .uri(URI.create("http://127.0.0.1:" + serverPort + path))
            .timeout(REQUEST_TIMEOUT)
            .GET()
            .build();
    return HttpClient.newHttpClient().send(request, HttpResponse.BodyHandlers.ofString());
  }

  private String databaseProduct() {
    try (var connection = dataSource.getConnection();
        ResultSet ignored = connection.createStatement().executeQuery("SELECT 1")) {
      return connection.getMetaData().getDatabaseProductName();
    } catch (SQLException exception) {
      throw new IllegalStateException("PostgreSQL must be available", exception);
    }
  }
}
