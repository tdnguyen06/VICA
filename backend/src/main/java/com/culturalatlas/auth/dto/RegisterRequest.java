package com.culturalatlas.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Past;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;

/** Self sign-up. Always creates a ROLE_USER account; phone, address, gender and date of birth are optional. */
public record RegisterRequest(
        @NotBlank(message = "username là bắt buộc")
        @Size(min = 3, max = 20, message = "username dài từ 3 đến 20 ký tự")
        @Pattern(regexp = "^[a-zA-Z0-9._-]+$", message = "username chỉ gồm chữ, số, dấu chấm, gạch dưới, gạch ngang")
        String username,

        @NotBlank(message = "email là bắt buộc") @Email(message = "email không hợp lệ") @Size(max = 100)
        String email,

        @NotBlank(message = "password là bắt buộc")
        @Pattern(regexp = PasswordRules.STRONG_PASSWORD, message = PasswordRules.STRONG_PASSWORD_MESSAGE)
        String password,

        @NotBlank(message = "fullName là bắt buộc") @Size(max = 100)
        String fullName,

        @Pattern(regexp = PasswordRules.PHONE, message = "số điện thoại phải có dạng 0xxxxxxxxx")
        String phone,

        @Size(max = 255) String address,

        @Pattern(regexp = PasswordRules.GENDER, message = "gender phải là MALE, FEMALE hoặc OTHER")
        String gender,

        @Past(message = "ngày sinh phải ở trong quá khứ") LocalDate dateOfBirth) {
}