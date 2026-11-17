package com.culturalatlas.geography;

/** Public province identity shared by Geographic API consumers. */
public record ProvinceDto(Long id, String slug, String name, String adminUnit) {
}
