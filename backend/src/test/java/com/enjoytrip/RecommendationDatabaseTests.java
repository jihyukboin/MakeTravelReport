package com.enjoytrip;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

import java.time.LocalDate;

@SpringBootTest
@EnabledIfEnvironmentVariable(named = "ENJOYTRIP_DB_TEST", matches = "true")
class RecommendationDatabaseTests {
    @Autowired RecommendationService service;
    @Autowired WebApplicationContext context;

    @Test
    void recommendationsUseSeedAttractionsAndCompatiblePublicChargers() {
        for (String category : new String[]{"NA01", "NA02", "HS01", "VE07"}) {
            var result = service.recommend(new RecommendationService.Request("서울 강남구 가로수길 5",
                    "서울", "강남구", category, "g80-ev", "sunset", 80, LocalDate.of(2026, 10, 15)));
            assertEquals(1, result.destinations().size());
            assertTrue(result.origin().approximate());
            double previousScore = -1;
            for (var destination : result.destinations()) {
                assertTrue(destination.attraction().category().startsWith(category));
                assertTrue(destination.chargerDistanceKm() <= 5);
                assertTrue(destination.charger().available() + destination.charger().charging() > 0);
                assertTrue(destination.score() >= previousScore);
                previousScore = destination.score();
                double required = (RecommendationService.distance(result.origin().point(), destination.attraction().point())
                        + RecommendationService.distance(destination.attraction().point(), destination.charger().point())) * 1.3;
                assertTrue(required <= result.estimatedReachKm() + 0.05);
                assertNotNull(destination.sun());
            }
        }
    }

    @Test
    void apiReturnsDatabaseResultsAndRejectsInvalidRequests() throws Exception {
        var mvc = MockMvcBuilders.webAppContextSetup(context).build();
        mvc.perform(post("/api/recommendations").contentType("application/json").content("""
                {"departure":"서울 중구 세종대로 110","sido":"서울특별시","sigungu":"중구",
                "category":"HS01","vehicle":"ioniq5","moment":"sunrise","batteryPercent":100,"date":"2026-10-15"}
                """))
                .andExpect(status().isOk()).andExpect(jsonPath("$.destinations.length()").value(1))
                .andExpect(jsonPath("$.vehicle.id").value("ioniq5"));
        mvc.perform(post("/api/recommendations").contentType("application/json").content("{}"))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.message").exists());
    }

    @Test
    void missingSolarDateIsNotReplacedByAnotherDate() {
        var result = service.recommend(new RecommendationService.Request("서울 중구", "서울", "중구", "HS01",
                "ioniq5", "sunrise", 100, LocalDate.of(2027, 1, 1)));
        assertFalse(result.destinations().isEmpty());
        assertTrue(result.destinations().stream().allMatch(d -> d.sun() == null));
    }
}
