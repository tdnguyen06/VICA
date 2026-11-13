package com.culturalatlas.admin;

import com.culturalatlas.admin.AdminUserDtos.AdminUser;
import com.culturalatlas.admin.AdminUserDtos.Stats;
import com.culturalatlas.admin.AdminUserDtos.UserPage;
import com.culturalatlas.common.ApiResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.security.Principal;

/** User statistics and management. ROLE_ADMIN only (SecurityConfig). */
@RestController
@RequestMapping("/api/v1/admin/users")
@RequiredArgsConstructor
public class AdminUserController {

    private final AdminUserService service;

    @GetMapping("/stats")
    public ApiResponse<Stats> stats() {
        return ApiResponse.success("Thống kê người dùng", service.stats());
    }

    @GetMapping
    public ApiResponse<UserPage> list(@RequestParam(defaultValue = "") String q,
                                      @RequestParam(defaultValue = "false") boolean includeDeleted,
                                      @RequestParam(defaultValue = "0") int page,
                                      @RequestParam(defaultValue = "20") int size) {
        return ApiResponse.success("Danh sách người dùng", service.list(q, includeDeleted, page, size));
    }

    @DeleteMapping("/{id}")
    public ApiResponse<AdminUser> delete(@PathVariable Long id, Principal principal) {
        return ApiResponse.success("Đã xoá mềm người dùng", service.softDelete(id, principal.getName()));
    }

    @PatchMapping("/{id}/restore")
    public ApiResponse<AdminUser> restore(@PathVariable Long id) {
        return ApiResponse.success("Đã khôi phục người dùng", service.restore(id));
    }
}
