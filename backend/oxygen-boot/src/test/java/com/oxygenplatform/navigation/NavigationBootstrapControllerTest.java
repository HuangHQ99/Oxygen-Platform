package com.oxygenplatform.navigation;

import static org.hamcrest.Matchers.containsInAnyOrder;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.oxygenplatform.application.workspace.WorkspaceQuery;
import com.oxygenplatform.application.workspace.WorkspaceSnapshot;
import com.oxygenplatform.application.workspace.WorkspaceSnapshot.ActorView;
import com.oxygenplatform.application.workspace.WorkspaceSnapshot.ClientGrantView;
import com.oxygenplatform.application.workspace.WorkspaceSnapshot.DataCentreView;
import com.oxygenplatform.application.workspace.WorkspaceSnapshot.ProviderView;
import com.oxygenplatform.identity.AuthenticatedIdentityResolver;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.security.authentication.TestingAuthenticationToken;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

@WebMvcTest(NavigationBootstrapController.class)
@Import(AuthenticatedIdentityResolver.class)
class NavigationBootstrapControllerTest {

  @Autowired private MockMvc mockMvc;
  @MockitoBean private WorkspaceQuery workspaceQuery;

  @Test
  void returnsOnlyDatabaseGrantsForAuthenticatedIdentity() throws Exception {
    UUID providerId = UUID.fromString("10000000-0000-0000-0000-000000000001");
    UUID actorId = UUID.fromString("40000000-0000-0000-0000-000000000001");
    UUID clientA = UUID.fromString("20000000-0000-0000-0000-00000000000a");
    UUID clientB = UUID.fromString("20000000-0000-0000-0000-00000000000b");
    when(workspaceQuery.loadWorkspace("demo", "aiman"))
        .thenReturn(
            new WorkspaceSnapshot(
                new ProviderView(providerId, "Oxygen Demo Services"),
                new ActorView(actorId, "Aiman Rahman", "Maintenance Lead / Field Engineer"),
                clientA,
                List.of(
                    new ClientGrantView(
                        clientA,
                        "CLIENT-A",
                        "客户 A（合成）",
                        List.of("PROVIDER_MAINTENANCE_LEAD", "PROVIDER_FIELD_ENGINEER"),
                        List.of(
                            new DataCentreView(
                                UUID.fromString("30000000-0000-0000-0000-0000000000a1"),
                                "A1",
                                "A1 数据中心",
                                "Asia/Kuala_Lumpur"),
                            new DataCentreView(
                                UUID.fromString("30000000-0000-0000-0000-0000000000a2"),
                                "A2",
                                "A2 数据中心",
                                "Asia/Kuala_Lumpur"))),
                    new ClientGrantView(
                        clientB,
                        "CLIENT-B",
                        "客户 B（合成）",
                        List.of("PROVIDER_FIELD_ENGINEER"),
                        List.of(
                            new DataCentreView(
                                UUID.fromString("30000000-0000-0000-0000-0000000000b1"),
                                "B1",
                                "B1 数据中心",
                                "Asia/Kuala_Lumpur"))))));

    mockMvc
        .perform(
            get("/api/v1/navigation/bootstrap")
                .principal(new TestingAuthenticationToken("aiman", "ignored")))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.demoMode").value(true))
        .andExpect(jsonPath("$.initialClientId").value(clientA.toString()))
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
