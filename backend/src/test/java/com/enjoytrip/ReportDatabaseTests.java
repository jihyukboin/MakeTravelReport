package com.enjoytrip;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;

import java.util.UUID;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@EnabledIfEnvironmentVariable(named = "ENJOYTRIP_DB_TEST", matches = "true")
class ReportDatabaseTests {
    @Autowired WebApplicationContext context;

    @Test void guestCanOpenOwnSnapshotButAnotherSessionCannot() throws Exception {
        var mvc = MockMvcBuilders.webAppContextSetup(context).build();
        String id = UUID.randomUUID().toString();
        var saved = mvc.perform(post("/api/reports/" + id).contentType("application/json")
                .content("{\"state\":\"{\\\"id\\\":\\\"" + id + "\\\"}\"}"))
                .andExpect(status().isOk()).andReturn();
        var session = (MockHttpSession) saved.getRequest().getSession(false);
        mvc.perform(get("/api/reports/" + id).session(session)).andExpect(status().isOk()).andExpect(jsonPath("$.state").exists());
        mvc.perform(get("/api/reports/" + id)).andExpect(status().isNotFound());
        mvc.perform(post("/api/reports/" + id).contentType("application/json").content("{\"state\":\"invalid\"}"))
                .andExpect(status().isBadRequest());
    }

    @Test void photoComesFromSeedImageTable() throws Exception {
        MockMvcBuilders.webAppContextSetup(context).build().perform(get("/api/attractions/822861/photo"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.imageUrl").isNotEmpty())
                .andExpect(jsonPath("$.copyrightType").value("Type1"));
    }
}
