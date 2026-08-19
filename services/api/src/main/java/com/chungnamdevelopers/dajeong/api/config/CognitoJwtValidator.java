package com.chungnamdevelopers.dajeong.api.config;

import org.springframework.security.oauth2.core.DelegatingOAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2TokenValidatorResult;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtClaimNames;
import org.springframework.security.oauth2.jwt.JwtClaimValidator;
import org.springframework.security.oauth2.jwt.JwtValidators;

import java.util.List;

public final class CognitoJwtValidator implements OAuth2TokenValidator<Jwt> {

    private final OAuth2TokenValidator<Jwt> delegate;

    public CognitoJwtValidator(String issuer, String audience) {
        OAuth2TokenValidator<Jwt> issuerAndTimestamps =
                JwtValidators.createDefaultWithIssuer(issuer);
        OAuth2TokenValidator<Jwt> audienceValidator =
                new JwtClaimValidator<List<String>>(
                        JwtClaimNames.AUD,
                        audiences -> audiences != null && audiences.contains(audience)
                );
        OAuth2TokenValidator<Jwt> tokenUseValidator =
                new JwtClaimValidator<String>(
                        "token_use",
                        tokenUse -> "access".equals(tokenUse)
                );
        OAuth2TokenValidator<Jwt> subjectValidator =
                new JwtClaimValidator<String>(
                        JwtClaimNames.SUB,
                        subject -> subject != null && !subject.isBlank()
                );

        this.delegate = new DelegatingOAuth2TokenValidator<>(
                issuerAndTimestamps,
                audienceValidator,
                tokenUseValidator,
                subjectValidator
        );
    }

    @Override
    public OAuth2TokenValidatorResult validate(Jwt token) {
        return delegate.validate(token);
    }
}
