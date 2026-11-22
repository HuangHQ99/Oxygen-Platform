package com.oxygenplatform.system;

import static org.hamcrest.Matchers.matchesPattern;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.oxygenplatform.OxygenApplication;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(SystemInfoController.class)
@Import(SystemInfoController.TimeConfiguration.class)
class SystemInfoControllerTest {

  private static final String UUID_PATTERN =
      "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";

  @Autowired private MockMvc mockMvc;

  @Test
  void returnsSystemInformationWithoutAuthentication() throws Exception {
    mockMvc
        .perform(get("/api/v1/system/info"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.application").value("Oxygen"))
        .andExpect(jsonPath("$.environment").value("local"))
        .andExpect(jsonPath("$.status").value("UP"))
        .andExpect(jsonPath("$.traceId").value(matchesPattern(UUID_PATTERN)));
  }
}
