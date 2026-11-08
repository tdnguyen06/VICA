package com.culturalatlas.geography;

public class ProvinceNotFoundException extends RuntimeException {
    public ProvinceNotFoundException() {
        super("Province not found");
    }
}
