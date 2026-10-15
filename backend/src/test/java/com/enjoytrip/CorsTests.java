package com.enjoytrip;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.options;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
class CorsTests {

	@Autowired
	private WebApplicationContext context;

	private MockMvc mvc;

	@BeforeEach
	void setUp() {
		mvc = MockMvcBuilders.webAppContextSetup(context).build();
	}

	@Test
	void allowsFrontendRequest() throws Exception {
		mvc.perform(get("/api/health").header("Origin", "http://localhost:3003"))
			.andExpect(status().isOk())
			.andExpect(header().string("Access-Control-Allow-Origin", "http://localhost:3003"))
			.andExpect(header().string("Access-Control-Allow-Credentials", "true"));
	}

	@Test
	void allowsJsonPreflight() throws Exception {
		mvc.perform(options("/api/health")
			.header("Origin", "http://127.0.0.1:3003")
			.header("Access-Control-Request-Method", "POST")
			.header("Access-Control-Request-Headers", "content-type,authorization"))
			.andExpect(status().isOk())
			.andExpect(header().string("Access-Control-Allow-Origin", "http://127.0.0.1:3003"))
			.andExpect(header().exists("Access-Control-Allow-Headers"));
	}

	@Test
	void rejectsUnapprovedOrigin() throws Exception {
		mvc.perform(get("/api/health").header("Origin", "http://localhost:4000"))
			.andExpect(status().isForbidden())
			.andExpect(header().doesNotExist("Access-Control-Allow-Origin"));
	}
}
