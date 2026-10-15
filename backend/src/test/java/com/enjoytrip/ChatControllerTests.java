package com.enjoytrip;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

class ChatControllerTests {
    private MockMvc mvc;

    @BeforeEach void setup() { mvc = MockMvcBuilders.standaloneSetup(new ChatController(null)).build(); }

    @Test void fixedAccountLoginRotatesSessionAndLogoutRevokesIt() throws Exception {
        MockHttpSession previous = new MockHttpSession();
        var login = mvc.perform(post("/api/auth/login").session(previous).contentType("application/json")
                        .content("{\"id\":\"test\",\"password\":\"test\"}"))
                .andExpect(status().isOk()).andReturn();
        assertTrue(previous.isInvalid());
        MockHttpSession session = (MockHttpSession) login.getRequest().getSession(false);
        assertNotNull(session);
        mvc.perform(get("/api/auth/me").session(session)).andExpect(jsonPath("$.authenticated").value(true));
        mvc.perform(post("/api/auth/logout").session(session)).andExpect(status().isOk());
        assertTrue(session.isInvalid());
        mvc.perform(get("/api/auth/me")).andExpect(jsonPath("$.authenticated").value(false));
    }

    @Test void wrongPasswordCannotCreateSessionAndGuestsCannotAccessHistory() throws Exception {
        var result = mvc.perform(post("/api/auth/login").contentType("application/json")
                        .content("{\"id\":\"test\",\"password\":\"wrong\"}"))
                .andExpect(status().isUnauthorized()).andExpect(jsonPath("$.message").exists()).andReturn();
        assertNull(result.getRequest().getSession(false));
        mvc.perform(get("/api/chats")).andExpect(status().isUnauthorized());
        mvc.perform(put("/api/chats/" + java.util.UUID.randomUUID()).contentType("application/json")
                .content("{\"title\":\"제목\",\"state\":\"{}\"}")).andExpect(status().isUnauthorized());
    }
}
