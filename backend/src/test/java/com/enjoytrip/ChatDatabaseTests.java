package com.enjoytrip;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;

import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@EnabledIfEnvironmentVariable(named = "ENJOYTRIP_DB_TEST", matches = "true")
class ChatDatabaseTests {
    @Autowired WebApplicationContext context;
    @Autowired JdbcTemplate db;

    @Test void chatIsSavedUpdatedAndLoadedForAuthenticatedUser() throws Exception {
        var mvc = MockMvcBuilders.webAppContextSetup(context).build();
        String id = UUID.randomUUID().toString();
        var login = mvc.perform(post("/api/auth/login").contentType("application/json")
                .content("{\"id\":\"test\",\"password\":\"test\"}")).andExpect(status().isOk()).andReturn();
        var session = (MockHttpSession) login.getRequest().getSession(false);
        try {
            mvc.perform(put("/api/chats/" + id).session(session).contentType("application/json")
                    .content("{\"title\":\"첫 여행\",\"state\":\"{\\\"messages\\\": []}\"}"))
                    .andExpect(status().isOk());
            mvc.perform(put("/api/chats/" + id).session(session).contentType("application/json")
                    .content("{\"title\":\"이어 쓴 여행\",\"state\":\"{\\\"messages\\\": [1]}\"}"))
                    .andExpect(status().isOk());
            assertEquals(1, db.queryForObject("SELECT COUNT(*) FROM chat_conversations WHERE id=?", Integer.class, id));
            assertEquals("이어 쓴 여행", db.queryForObject("SELECT title FROM chat_conversations WHERE id=? AND owner_id='test'", String.class, id));
            mvc.perform(get("/api/chats").session(session)).andExpect(status().isOk())
                    .andExpect(jsonPath("$[?(@.id == '" + id + "')].title").value("이어 쓴 여행"));
            mvc.perform(put("/api/chats/" + id).session(session).contentType("application/json")
                    .content("{\"title\":\"잘못된 JSON\",\"state\":\"invalid\"}"))
                    .andExpect(status().isBadRequest());
        } finally { db.update("DELETE FROM chat_conversations WHERE id=?", id); }
    }
}
