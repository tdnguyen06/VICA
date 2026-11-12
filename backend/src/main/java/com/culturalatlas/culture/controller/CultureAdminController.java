package com.culturalatlas.culture.controller;

import com.culturalatlas.common.ApiResponse;
import com.culturalatlas.culture.dto.CultureAdminRequests.EntryRequest;
import com.culturalatlas.culture.dto.CultureAdminRequests.ReviewRequest;
import com.culturalatlas.culture.dto.CultureAdminRequests.SourceRequest;
import com.culturalatlas.culture.dto.CultureDtos.EntryDetailDto;
import com.culturalatlas.culture.dto.CultureDtos.SourceDto;
import com.culturalatlas.culture.service.CultureCommandService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

/** Basic content administration (CUL-07). Access is restricted to ADMIN/RESEARCHER in SecurityConfig. */
@RestController
@RequestMapping("/api/v1/admin/cultures")
@RequiredArgsConstructor
@Tag(name = "Culture Admin", description = "Create/update cultural content with source and province validation (ADMIN, RESEARCHER)")
public class CultureAdminController {
    private final CultureCommandService service;

    @PostMapping("/entries")
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Create an entry; 400 if sources are missing, province is wrong or data is invalid")
    public ApiResponse<EntryDetailDto> createEntry(@Valid @RequestBody EntryRequest request) {
        return ApiResponse.success("Đã tạo nội dung văn hóa", service.createEntry(request));
    }

    @PutMapping("/entries/{id}")
    @Operation(summary = "Replace an entry, including its source links and media")
    public ApiResponse<EntryDetailDto> updateEntry(@PathVariable Long id, @Valid @RequestBody EntryRequest request) {
        return ApiResponse.success("Đã cập nhật nội dung văn hóa", service.updateEntry(id, request));
    }

    @DeleteMapping("/entries/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(summary = "Delete an entry together with its source links and media")
    public void deleteEntry(@PathVariable Long id) {
        service.deleteEntry(id);
    }

    @PostMapping("/sources")
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Register a source; it starts as PENDING until reviewed")
    public ApiResponse<SourceDto> createSource(@Valid @RequestBody SourceRequest request) {
        return ApiResponse.success("Đã tạo nguồn, chờ kiểm duyệt", service.createSource(request));
    }

    @PatchMapping("/sources/{id}/review")
    @Operation(summary = "Approve or reject a source")
    public ApiResponse<SourceDto> reviewSource(@PathVariable Long id, @Valid @RequestBody ReviewRequest request) {
        return ApiResponse.success("Đã cập nhật trạng thái kiểm duyệt", service.reviewSource(id, request.reviewStatus()));
    }
}
