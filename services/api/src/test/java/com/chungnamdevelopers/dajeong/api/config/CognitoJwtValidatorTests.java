package com.chungnamdevelopers.dajeong.api.config;

import org.junit.jupiter.api.Test;
import org.springframework.security.oauth2.core.OAuth2TokenValidatorResult;
import org.springframework.security.oauth2.jwt.Jwt;

import java.time.Instant;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class CognitoJwtValidatorTests {

    private static final String ISSUER = "https://issuer.example.com/pool";
    private static final String AUDIENCE = "https://api.example.com";
    private final CognitoJwtValidator validator =
            new CognitoJwtValidator(ISSUER, AUDIENCE);

    @Test
    void acceptsAnUnexpiredAccessTokenForTheConfiguredIssuerAndAudience() {
        OAuth2TokenValidatorResult result = validator.validate(token(
                ISSUER,
                List.of(AUDIENCE),
                "access",
                Instant.now().minusSeconds(30),
                Instant.now().plusSeconds(300)
        ));

        assertThat(result.hasErrors()).isFalse();
    }

    @Test
    void rejectsWrongIssuerAudienceTokenUseAndExpiry() {
        assertThat(validator.validate(token(
                "https://issuer.example.com/other",
                List.of(AUDIENCE),
                "access",
                Instant.now().minusSeconds(30),
                Instant.now().plusSeconds(300)
        )).hasErrors()).isTrue();
        assertThat(validator.validate(token(
                ISSUER,
                List.of("https://other-api.example.com"),
                "access",
                Instant.now().minusSeconds(30),
                Instant.now().plusSeconds(300)
        )).hasErrors()).isTrue();
        assertThat(validator.validate(token(
                ISSUER,
                List.of(AUDIENCE),
                "id",
                Instant.now().minusSeconds(30),
                Instant.now().plusSeconds(300)
        )).hasErrors()).isTrue();
        assertThat(validator.validate(token(
                ISSUER,
                List.of(AUDIENCE),
                "access",
                Instant.now().minusSeconds(600),
                Instant.now().minusSeconds(300)
        )).hasErrors()).isTrue();
    }

    @Test
    void rejectsATokenWithoutASubject() {
        Jwt token = Jwt.withTokenValue("token")
                .header("alg", "RS256")
                .issuer(ISSUER)
                .audience(List.of(AUDIENCE))
                .issuedAt(Instant.now().minusSeconds(30))
                .expiresAt(Instant.now().plusSeconds(300))
                .claim("token_use", "access")
                .build();

        assertThat(validator.validate(token).hasErrors()).isTrue();
    }

    private Jwt token(
            String issuer,
            List<String> audiences,
            String tokenUse,
            Instant issuedAt,
            Instant expiresAt
    ) {
        return Jwt.withTokenValue("token")
                .header("alg", "RS256")
                .subject("cognito-subject")
                .issuer(issuer)
                .audience(audiences)
                .issuedAt(issuedAt)
                .expiresAt(expiresAt)
                .claim("token_use", tokenUse)
                .build();
    }
}
