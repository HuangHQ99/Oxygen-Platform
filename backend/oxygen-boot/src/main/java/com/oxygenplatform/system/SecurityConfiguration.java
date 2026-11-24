package com.oxygenplatform.system;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpStatus;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.factory.PasswordEncoderFactories;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.provisioning.InMemoryUserDetailsManager;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.HttpStatusEntryPoint;

/** Selects local form login or the cloud OIDC login without weakening API authorization. */
@Configuration
class SecurityConfiguration {

  private static void authorize(HttpSecurity http) throws Exception {
    http.authorizeHttpRequests(
            requests ->
                requests
                    .requestMatchers("/actuator/health/**", "/api/v1/system/info", "/error")
                    .permitAll()
                    .anyRequest()
                    .authenticated())
        .exceptionHandling(
            exceptions ->
                exceptions.defaultAuthenticationEntryPointFor(
                    new HttpStatusEntryPoint(HttpStatus.UNAUTHORIZED),
                    request -> request.getServletPath().startsWith("/api/")));
  }

  @Bean
  @ConditionalOnProperty(name = "oxygen.auth.mode", havingValue = "demo", matchIfMissing = true)
  SecurityFilterChain demoSecurityFilterChain(HttpSecurity http) throws Exception {
    authorize(http);
    return http.formLogin(Customizer.withDefaults()).build();
  }

  @Bean
  @ConditionalOnProperty(name = "oxygen.auth.mode", havingValue = "oidc")
  SecurityFilterChain oidcSecurityFilterChain(HttpSecurity http) throws Exception {
    authorize(http);
    return http.oauth2Login(Customizer.withDefaults()).build();
  }

  @Bean
  @ConditionalOnProperty(name = "oxygen.auth.mode", havingValue = "demo", matchIfMissing = true)
  PasswordEncoder passwordEncoder() {
    return PasswordEncoderFactories.createDelegatingPasswordEncoder();
  }

  @Bean
  @ConditionalOnProperty(name = "oxygen.auth.mode", havingValue = "demo", matchIfMissing = true)
  UserDetailsService demoUsers(
      PasswordEncoder passwordEncoder,
      @Value("${oxygen.auth.demo-password:local-only-change-me}") String password) {
    return new InMemoryUserDetailsManager(
        User.withUsername("aiman")
            .password(passwordEncoder.encode(password))
            .roles("OXYGEN_USER")
            .build(),
        User.withUsername("lina")
            .password(passwordEncoder.encode(password))
            .roles("OXYGEN_USER")
            .build());
  }
}
