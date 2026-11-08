package com.culturalatlas.geography;

import com.culturalatlas.common.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/geo")
@Tag(name = "Geographic", description = "Province identities and WGS84 spatial lookup for vica-demo-63-v1")
public class GeographicController {
    private final GeographicService service;

    public GeographicController(GeographicService service) {
        this.service = service;
    }

    @GetMapping("/provinces")
    @Operation(summary = "List provinces ordered by slug")
    public ApiResponse<List<ProvinceDto>> list() {
        return ApiResponse.success(service.list());
    }

    @GetMapping("/provinces/{slug}")
    @Operation(summary = "Get a province by its exact registry slug; 404 if absent")
    public ApiResponse<ProvinceDto> detail(@PathVariable String slug) {
        return ApiResponse.success(service.detail(slug));
    }

    @PostMapping("/identify")
    @Operation(summary = "Identify province using WGS84 coordinates",
            description = "Boundary points are included; ties use the smallest ASCII slug. "
                    + "Valid points outside supported geometry return 200 with data=null. "
                    + "Missing, malformed or out-of-range coordinates return 400; database failures return 500.")
    public ApiResponse<ProvinceDto> identify(@Valid @RequestBody IdentifyProvinceRequest request) {
        return ApiResponse.success(service.identify(request));
    }
}
