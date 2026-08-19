package com.chungnamdevelopers.dajeong.api.config;

import org.springframework.boot.EnvironmentPostProcessor;
import org.springframework.boot.SpringApplication;
import org.springframework.core.Ordered;
import org.springframework.core.env.ConfigurableEnvironment;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Set;

public final class DeploymentEnvironmentPostProcessor
        implements EnvironmentPostProcessor, Ordered {

    private static final Set<String> DEPLOYMENT_PROFILES = Set.of("staging", "production");
    private static final List<String> REQUIRED_VARIABLES = List.of(
            "DAJEONG_DB_HOST",
            "DAJEONG_DB_PORT",
            "DAJEONG_DB_NAME",
            "DAJEONG_DB_USER",
            "DAJEONG_DB_PASSWORD"
    );
    private static final String LOCAL_PASSWORD = "dajeong-local-only";

    @Override
    public void postProcessEnvironment(
            ConfigurableEnvironment environment,
            SpringApplication application
    ) {
        List<String> activeDeploymentProfiles = Arrays.stream(environment.getActiveProfiles())
                .filter(DEPLOYMENT_PROFILES::contains)
                .toList();

        if (activeDeploymentProfiles.isEmpty()) {
            return;
        }

        List<String> problems = new ArrayList<>();

        if (activeDeploymentProfiles.size() > 1) {
            problems.add("staging과 production 프로필을 동시에 활성화할 수 없습니다.");
        }

        for (String variable : REQUIRED_VARIABLES) {
            if (isBlank(environment.getProperty(variable))) {
                problems.add(variable + "이(가) 필요합니다.");
            }
        }

        String portValue = environment.getProperty("DAJEONG_DB_PORT");

        if (!isBlank(portValue) && !isValidPort(portValue)) {
            problems.add("DAJEONG_DB_PORT는 1~65535 사이의 정수여야 합니다.");
        }

        if (LOCAL_PASSWORD.equals(environment.getProperty("DAJEONG_DB_PASSWORD"))) {
            problems.add("DAJEONG_DB_PASSWORD에 로컬 전용 예제값을 사용할 수 없습니다.");
        }

        if (!problems.isEmpty()) {
            String profile = String.join(",", activeDeploymentProfiles);
            throw new IllegalStateException(
                    "API " + profile + " 환경 설정이 올바르지 않습니다.\n- "
                            + String.join("\n- ", problems)
            );
        }
    }

    @Override
    public int getOrder() {
        return Ordered.LOWEST_PRECEDENCE;
    }

    private static boolean isBlank(String value) {
        return value == null || value.isBlank();
    }

    private static boolean isValidPort(String value) {
        try {
            int port = Integer.parseInt(value);
            return port >= 1 && port <= 65_535;
        } catch (NumberFormatException ignored) {
            return false;
        }
    }
}
