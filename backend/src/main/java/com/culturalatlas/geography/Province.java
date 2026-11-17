package com.culturalatlas.geography;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;

/** Province identity. The spatial boundary is read through ProvinceRepository SQL. */
@Entity
@Table(name = "provinces")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@AllArgsConstructor
public class Province {
    @Id
    private Long id;

    @Column(nullable = false, unique = true, length = 100)
    private String slug;

    @Column(nullable = false, length = 150)
    private String name;

    @Column(name = "admin_unit", nullable = false, length = 200)
    private String adminUnit;
}
