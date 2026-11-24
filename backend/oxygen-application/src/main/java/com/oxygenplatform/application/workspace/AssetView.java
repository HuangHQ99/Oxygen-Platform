package com.oxygenplatform.application.workspace;

import java.util.UUID;

/** Minimal W02-03 asset projection returned only after grant checks. */
public record AssetView(
    UUID id,
    UUID clientId,
    UUID dataCentreId,
    String assetCode,
    String gaCode,
    String name,
    String equipmentType,
    String status) {}
