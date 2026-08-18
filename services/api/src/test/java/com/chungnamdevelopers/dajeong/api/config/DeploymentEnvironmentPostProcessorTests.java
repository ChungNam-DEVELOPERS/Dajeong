package com.chungnamdevelopers.dajeong.api.config;

import com.chungnamdevelopers.dajeong.api.DajeongApiApplication;
import org.junit.jupiter.api.Test;
import org.springframework.boot.SpringApplication;
import org.springframework.mock.env.MockEnvironment;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class DeploymentEnvironmentPostProcessorTests {

    private final DeploymentEnvironmentPostProcessor postProcessor =
            new DeploymentEnvironmentPostProcessor();
    private final SpringApplication application =
            new SpringApplication(DajeongApiApplication.class);

    @Test
    void localProfileDoesNotRequireDeploymentVariables() {
        MockEnvironment environment = new MockEnvironment();
        environment.setActiveProfiles("local");

        assertThatCode(() -> postProcessor.postProcessEnvironment(environment, application))
                .doesNotThrowAnyException();
    }

    @Test
    void stagingProfileReportsEveryMissingVariableWithoutValues() {
        MockEnvironment environment = new MockEnvironment();
        environment.setActiveProfiles("staging");

        assertThatThrownBy(() -> postProcessor.postProcessEnvironment(environment, application))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("API staging 환경 설정이 올바르지 않습니다.")
                .hasMessageContaining("DAJEONG_DB_HOST")
                .hasMessageContaining("DAJEONG_DB_PORT")
                .hasMessageContaining("DAJEONG_DB_NAME")
                .hasMessageContaining("DAJEONG_DB_USER")
                .hasMessageContaining("DAJEONG_DB_PASSWORD");
    }

    @Test
    void productionProfileRejectsInvalidPortAndLocalPassword() {
        MockEnvironment environment = deploymentEnvironment("production");
        environment.setProperty("DAJEONG_DB_PORT", "70000");
        environment.setProperty("DAJEONG_DB_PASSWORD", "dajeong-local-only");

        assertThatThrownBy(() -> postProcessor.postProcessEnvironment(environment, application))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("DAJEONG_DB_PORT는 1~65535 사이의 정수여야 합니다.")
                .hasMessageContaining("DAJEONG_DB_PASSWORD에 로컬 전용 예제값을 사용할 수 없습니다.");
    }

    @Test
    void deploymentProfileAcceptsCompleteVariables() {
        MockEnvironment environment = deploymentEnvironment("staging");

        assertThatCode(() -> postProcessor.postProcessEnvironment(environment, application))
                .doesNotThrowAnyException();
    }

    private static MockEnvironment deploymentEnvironment(String profile) {
        MockEnvironment environment = new MockEnvironment();
        environment.setActiveProfiles(profile);
        environment.setProperty("DAJEONG_DB_HOST", "database.internal");
        environment.setProperty("DAJEONG_DB_PORT", "5432");
        environment.setProperty("DAJEONG_DB_NAME", "dajeong");
        environment.setProperty("DAJEONG_DB_USER", "dajeong");
        environment.setProperty("DAJEONG_DB_PASSWORD", "validation-only-value");
        return environment;
    }
}
