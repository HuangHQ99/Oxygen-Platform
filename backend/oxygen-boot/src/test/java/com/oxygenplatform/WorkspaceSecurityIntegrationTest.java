package com.oxygenplatform;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestBuilders.formLogin;
import static org.springframework.security.test.web.servlet.response.SecurityMockMvcResultMatchers.authenticated;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

@SpringBootTest
@AutoConfigureMockMvc
@Testcontainers(disabledWithoutDocker = true)
class WorkspaceSecurityIntegrationTest {

  private static final String CLIENT_A = "20000000-0000-0000-0000-00000000000a";
  private static final String CLIENT_B = "20000000-0000-0000-0000-00000000000b";
  private static final String ASSET_A = "60000000-0000-0000-0000-00000000000a";
  private static final String ASSET_B = "60000000-0000-0000-0000-00000000000b";

  @Container
  static final PostgreSQLContainer<?> postgres =
      new PostgreSQLContainer<>("postgres:17.7-alpine")
          .withDatabaseName("oxygen")
          .withUsername("oxygen")
          .withPassword("local-only-change-me");

  @DynamicPropertySource
  static void databaseProperties(DynamicPropertyRegistry registry) {
    registry.add("spring.datasource.url", postgres::getJdbcUrl);
    registry.add("spring.datasource.username", postgres::getUsername);
    registry.add("spring.datasource.password", postgres::getPassword);
  }

  @Autowired private MockMvc mockMvc;

  @Test
  void linaReadsAuthorizedAssetAndCannotProbeAnotherClient() throws Exception {
    MvcResult login =
        mockMvc
            .perform(formLogin().user("lina").password("local-only-change-me"))
            .andExpect(authenticated().withUsername("lina"))
            .andReturn();
    MockHttpSession session = (MockHttpSession) login.getRequest().getSession(false);

    mockMvc
        .perform(withSession(get("/api/v1/navigation/bootstrap"), session))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.actor.name").value("Lina Tan"))
        .andExpect(jsonPath("$.grants.length()").value(1))
        .andExpect(jsonPath("$.grants[0].clientId").value(CLIENT_A));

    mockMvc
        .perform(
            withSession(
                get("/api/v1/clients/{clientId}/assets/{assetId}", CLIENT_A, ASSET_A),
                session))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.assetCode").value("FM200-001"))
        .andExpect(jsonPath("$.clientId").value(CLIENT_A));

    mockMvc
        .perform(
            withSession(
                get("/api/v1/clients/{clientId}/assets/{assetId}", CLIENT_B, ASSET_B),
                session))
        .andExpect(status().isNotFound());
  }

  private static MockHttpServletRequestBuilder withSession(
      MockHttpServletRequestBuilder request, MockHttpSession session) {
    return request.session(session);
  }
}
