package com.chungnamdevelopers.dajeong.api.integration.weather;

public class WeatherForecastException extends RuntimeException {

    public WeatherForecastException(String message) {
        super(message);
    }

    public WeatherForecastException(String message, Throwable cause) {
        super(message, cause);
    }
}
