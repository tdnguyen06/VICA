package com.culturalatlas.auth.dto;

/** Shared validation rules for passwords and contact fields (used by several request DTOs). */
public final class PasswordRules {
    private PasswordRules() {
    }

    /** At least 8 characters with a lowercase letter, an uppercase letter, a digit and a special character. */
    public static final String STRONG_PASSWORD = "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[^A-Za-z0-9]).{8,}$";
    public static final String STRONG_PASSWORD_MESSAGE =
            "mật khẩu tối thiểu 8 ký tự, gồm chữ thường, chữ hoa, chữ số và ký tự đặc biệt";

    /** Vietnamese mobile number: 0 followed by 9 digits. */
    public static final String PHONE = "^0[0-9]{9}$";
    public static final String GENDER = "MALE|FEMALE|OTHER";
}
