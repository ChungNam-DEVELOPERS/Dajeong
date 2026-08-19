package com.chungnamdevelopers.dajeong.api;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.web.servlet.MockMvc;

import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class OpenApiDocumentGenerationTests {

    private static final String OUTPUT_PROPERTY = "dajeong.openapi.output";

    @Autowired
    private MockMvc mockMvc;

    @Test
    void generatesTheApiContract() throws Exception {
        String document = mockMvc.perform(get("/v3/api-docs"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.openapi").value("3.1.0"))
                .andExpect(jsonPath("$.paths['/api/v1/system/health'].get.operationId")
                        .value("getSystemHealth"))
                .andExpect(jsonPath("$.paths['/api/v1/system/health'].get.responses['200']"
                        + ".content['application/json'].schema['$ref']")
                        .value("#/components/schemas/SystemHealthResponse"))
                .andExpect(jsonPath("$.paths['/api/v1/system/health'].get.responses['503']"
                        + ".content['application/json'].schema['$ref']")
                        .value("#/components/schemas/SystemHealthResponse"))
                .andExpect(jsonPath("$.paths['/api/v1/me'].get.operationId")
                        .value("getCurrentUser"))
                .andExpect(jsonPath("$.paths['/api/v1/me'].get.security[0].bearerAuth")
                        .isArray())
                .andExpect(jsonPath("$.paths['/api/v1/me'].delete.operationId")
                        .value("deleteCurrentUser"))
                .andExpect(jsonPath("$.paths['/api/v1/me'].delete.responses['204']")
                        .exists())
                .andExpect(jsonPath("$.paths['/api/v1/trips'].post.operationId")
                        .value("createTrip"))
                .andExpect(jsonPath("$.paths['/api/v1/trips'].post.parameters[0].name")
                        .value("Idempotency-Key"))
                .andExpect(jsonPath("$.paths['/api/v1/trips'].get.operationId")
                        .value("listTrips"))
                .andExpect(jsonPath("$.paths['/api/v1/trips'].get.security[0].bearerAuth")
                        .isArray())
                .andExpect(jsonPath("$.paths['/api/v1/trips/{tripId}'].get.operationId")
                        .value("getTrip"))
                .andExpect(jsonPath("$.paths['/api/v1/trips/{tripId}/invites'].post.operationId")
                        .value("issueTripInvite"))
                .andExpect(jsonPath("$.paths['/api/v1/invites/{code}/join'].post.operationId")
                        .value("joinTripByInvite"))
                .andExpect(jsonPath("$.paths['/api/v1/invites/{code}/join'].post.responses['409']"
                        + ".content['application/json'].schema['$ref']")
                        .value("#/components/schemas/ApiErrorResponse"))
                .andExpect(jsonPath("$.paths['/api/v1/trips/{tripId}/itineraries/draft']"
                        + ".get.operationId")
                        .value("getItineraryDraft"))
                .andExpect(jsonPath("$.paths['/api/v1/trips/{tripId}/itineraries/current']"
                        + ".get.operationId")
                        .value("getCurrentItinerary"))
                .andExpect(jsonPath("$.paths['/api/v1/trips/{tripId}/itineraries/timeline']"
                        + ".get.operationId")
                        .value("getItineraryTimeline"))
                .andExpect(jsonPath("$.paths['/api/v1/notifications'].get.operationId")
                        .value("listNotifications"))
                .andExpect(jsonPath("$.paths['/api/v1/notifications/{notificationId}/read']"
                        + ".post.operationId")
                        .value("readNotification"))
                .andExpect(jsonPath("$.paths['/api/v1/trips/{tripId}/itineraries/draft/slots']"
                        + ".post.operationId")
                        .value("addItineraryDraftSlot"))
                .andExpect(jsonPath("$.paths['/api/v1/trips/{tripId}/itineraries/draft/slots/{slotId}']"
                        + ".patch.operationId")
                        .value("updateItineraryDraftSlot"))
                .andExpect(jsonPath("$.paths['/api/v1/trips/{tripId}/itineraries/draft/slots/{slotId}']"
                        + ".delete.operationId")
                        .value("deleteItineraryDraftSlot"))
                .andExpect(jsonPath("$.paths['/api/v1/trips/{tripId}/itineraries/draft/publish']"
                        + ".post.operationId")
                        .value("publishItineraryDraft"))
                .andExpect(jsonPath("$.paths['/api/v1/trips/{tripId}/preferences/me']"
                        + ".get.operationId")
                        .value("getMyPrivatePreference"))
                .andExpect(jsonPath("$.paths['/api/v1/trips/{tripId}/preferences/me']"
                        + ".put.operationId")
                        .value("saveMyPrivatePreference"))
                .andExpect(jsonPath("$.paths['/api/v1/trips/{tripId}/preferences/status']"
                        + ".get.operationId")
                        .value("getPreferenceSubmissionStatus"))
                .andReturn()
                .getResponse()
                .getContentAsString(StandardCharsets.UTF_8);

        String output = System.getProperty(OUTPUT_PROPERTY);
        if (output == null || output.isBlank()) {
            return;
        }

        Path outputPath = Path.of(output).toAbsolutePath().normalize();
        Files.createDirectories(outputPath.getParent());
        Files.writeString(outputPath, document, StandardCharsets.UTF_8);
    }
}
