package com.oxygenplatform;

import static org.assertj.core.api.Assertions.assertThat;

import java.sql.ResultSet;
import java.sql.SQLException;
import javax.sql.DataSource;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.jdbc.core.JdbcTemplate;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

@Testcontainers
@SpringBootTest
class SystemReadinessIntegrationTest {

  @Container @ServiceConnection
  static final PostgreSQLContainer<?> POSTGRES =
      new PostgreSQLContainer<>("postgres:17.7-alpine");

  @Autowired private DataSource dataSource;

  @Test
  void migrationCreatesBaselineAndDatabaseIsReachable() {
    JdbcTemplate jdbc = new JdbcTemplate(dataSource);
    Integer baselineCount =
        jdbc.queryForObject("SELECT count(*) FROM platform_baseline", Integer.class);

    assertThat(baselineCount).isEqualTo(1);
    assertThat(databaseProduct()).isEqualTo("PostgreSQL");
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
