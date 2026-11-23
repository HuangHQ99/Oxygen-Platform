package com.oxygenplatform.navigation;

import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Supplies synthetic workspace grants until W02-03 connects a real identity provider.
 *
 * <p>The response is intentionally marked as demo data. It is a navigation prototype, not an
 * authorization decision or a source of customer business records.
 */
@RestController
@RequestMapping("/api/v1/navigation")
public class NavigationBootstrapController {

  /** Returns synthetic grants used to exercise navigation before identity integration. */
  @GetMapping("/bootstrap")
  public WorkspaceBootstrap bootstrap() {
    ClientGrant clientA =
        new ClientGrant(
            "client-a-demo",
            "CLIENT-A",
            "客户 A（合成）",
            List.of("PROVIDER_MAINTENANCE_LEAD", "PROVIDER_FIELD_ENGINEER"),
            List.of(
                new DataCentre("site-a1-demo", "A1", "A1 数据中心", "Asia/Kuala_Lumpur"),
                new DataCentre("site-a2-demo", "A2", "A2 数据中心", "Asia/Kuala_Lumpur")));
    ClientGrant clientB =
        new ClientGrant(
            "client-b-demo",
            "CLIENT-B",
            "客户 B（合成）",
            List.of("PROVIDER_FIELD_ENGINEER"),
            List.of(
                new DataCentre("site-b1-demo", "B1", "B1 数据中心", "Asia/Kuala_Lumpur")));

    return new WorkspaceBootstrap(
        true,
        new Provider("provider-demo", "Oxygen Demo Services"),
        new Actor("actor-demo", "Aiman Rahman", "Maintenance Lead / Field Engineer"),
        "client-a-demo",
        List.of(clientA, clientB));
  }

  /** Complete navigation context returned during application bootstrap. */
  public record WorkspaceBootstrap(
      boolean demoMode,
      Provider provider,
      Actor actor,
      String initialClientId,
      List<ClientGrant> grants) {}

  /** Service provider display identity. */
  public record Provider(String id, String name) {}

  /** Signed-in actor display identity. */
  public record Actor(String id, String name, String position) {}

  /** One customer's independent roles and authorised data-centre scope. */
  public record ClientGrant(
      String clientId,
      String clientCode,
      String clientName,
      List<String> roles,
      List<DataCentre> dataCentres) {}

  /** Data centre within a client grant. */
  public record DataCentre(String id, String code, String name, String timeZone) {}
}
