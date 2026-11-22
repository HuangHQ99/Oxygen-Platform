package com.oxygenplatform.system;

import java.time.Clock;
import java.time.Instant;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Exposes non-sensitive runtime information used by the development shell. */
@RestController
@RequestMapping("/api/v1/system")
public class SystemInfoController {

  private final Clock clock;
  private final String environment;

  public SystemInfoController(
      Clock clock, @Value("${oxygen.environment:local}") String environment) {
    this.clock = clock;
    this.environment = environment;
  }

  @GetMapping("/info")
  public SystemInfo systemInfo() {
    return new SystemInfo(
        "Oxygen", environment, "UP", Instant.now(clock), UUID.randomUUID().toString());
  }

  /** A safe subset of service information for connectivity checks. */
  public record SystemInfo(
      String application,
      String environment,
      String status,
      Instant serverTime,
      String traceId) {}

  @Configuration
  static class TimeConfiguration {

    @Bean
    Clock systemClock() {
      return Clock.systemUTC();
    }
  }
}
