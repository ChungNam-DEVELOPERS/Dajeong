package com.chungnamdevelopers.dajeong.api.config;

import jakarta.validation.constraints.NotBlank;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

@Validated
@ConfigurationProperties("dajeong.auth")
public record CognitoAuthProperties(
        @NotBlank String issuer,
        @NotBlank String audience
) {

    public String jwkSetUri() {
        return issuer.replaceAll("/+$", "") + "/.well-known/jwks.json";
    }
}
