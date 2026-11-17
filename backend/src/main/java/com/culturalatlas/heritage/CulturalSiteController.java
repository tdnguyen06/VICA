package com.culturalatlas.heritage;

import com.culturalatlas.common.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/cultural-sites")
@RequiredArgsConstructor
@Tag(name = "Cultural Sites & GIS", description = "Endpoints cung cấp dữ liệu không gian địa lý và di sản văn hóa Việt Nam từ PostGIS")
public class CulturalSiteController {

    private final CulturalSiteService culturalSiteService;

    @GetMapping
    @Operation(summary = "Lấy danh sách các điểm di sản văn hóa theo danh mục (tất cả hoặc theo chủ đề)")
    public ResponseEntity<ApiResponse<List<CulturalSiteDto>>> getCulturalSites(
            @RequestParam(required = false) String category
    ) {
        List<CulturalSiteDto> sites = culturalSiteService.getAllSites(category);
        return ResponseEntity.ok(ApiResponse.success(
                String.format("Lấy thành công %d địa điểm văn hóa từ hệ thống PostGIS", sites.size()),
                sites
        ));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Chi tiết điểm di sản văn hóa theo ID")
    public ResponseEntity<ApiResponse<CulturalSiteDto>> getCulturalSiteById(@PathVariable Long id) {
        return culturalSiteService.getSiteById(id)
                .map(site -> ResponseEntity.ok(ApiResponse.success("Thành công", site)))
                .orElseGet(() -> ResponseEntity.status(404).body(ApiResponse.error("Không tìm thấy địa điểm di sản")));
    }

    @GetMapping("/slug/{slug}")
    @Operation(summary = "Chi tiết điểm di sản văn hóa theo Slug")
    public ResponseEntity<ApiResponse<CulturalSiteDto>> getCulturalSiteBySlug(@PathVariable String slug) {
        return culturalSiteService.getSiteBySlug(slug)
                .map(site -> ResponseEntity.ok(ApiResponse.success("Thành công", site)))
                .orElseGet(() -> ResponseEntity.status(404).body(ApiResponse.error("Không tìm thấy địa điểm di sản")));
    }
}

