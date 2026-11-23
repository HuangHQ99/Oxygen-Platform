package com.oxygenplatform.navigation;

import static org.hamcrest.Matchers.containsInAnyOrder;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(NavigationBootstrapController.class)
class NavigationBootstrapControllerTest {

  @Autowired private MockMvc mockMvc;

  @Test
  void returnsTwoSyntheticClientGrantsWithoutAuthentication() throws Exception {
    mockMvc
        .perform(get("/api/v1/navigation/bootstrap"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.demoMode").value(true))
        .andExpect(jsonPath("$.initialClientId").value("client-a-demo"))
        .andExpect(jsonPath("$.grants.length()").value(2))
        .andExpect(jsonPath("$.grants[0].dataCentres.length()").value(2))
        .andExpect(
            jsonPath("$.grants[0].roles")
                .value(
                    containsInAnyOrder(
                        "PROVIDER_MAINTENANCE_LEAD", "PROVIDER_FIELD_ENGINEER")))
        .andExpect(jsonPath("$.grants[1].dataCentres[0].code").value("B1"));
  }
}
