package com.culturalatlas.auth.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Past;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;

/** PUT /me replaces the editable profile fields. Empty phone/address/gender clear them. */
public record UpdateProfileRequest(
        @NotBlank(message = "fullName là bắt buộc") @Size(max = 100) String fullName,

        @Pattern(regexp = "^$|" + PasswordRules.PHONE, message = "số điện thoại phải có dạng 0xxxxxxxxx")
        String phone,

        @Size(max = 255) String address,

        @Pattern(regexp = "^$|" + PasswordRules.GENDER, message = "gender phải là MALE, FEMALE hoặc OTHER")
        String gender,

        @Past(message = "ngày sinh phải ở trong quá khứ") LocalDate dateOfBirth) {
}