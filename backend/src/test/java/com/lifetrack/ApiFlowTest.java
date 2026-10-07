package com.lifetrack;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDate;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Runs the main user journey against the real API with an in-memory database: mvn test */
@SpringBootTest
@AutoConfigureMockMvc
@TestPropertySource(properties = "spring.datasource.url=jdbc:h2:mem:lifetrack-test;DB_CLOSE_DELAY=-1")
class ApiFlowTest {

    @Autowired
    MockMvc mvc;

    @Autowired
    ObjectMapper json;

    @Test
    void signUpCreateHabitCheckOffAndSeeStats() throws Exception {
        String today = LocalDate.now().toString();

        // Sign up
        String body = mvc.perform(post("/api/auth/signup").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Htet\",\"email\":\"htet@example.com\",\"password\":\"password123\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.user.email").value("htet@example.com"))
                .andReturn().getResponse().getContentAsString();
        String token = "Bearer " + json.readTree(body).get("token").asText();

        // Same email again is rejected
        mvc.perform(post("/api/auth/signup").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Htet\",\"email\":\"HTET@example.com\",\"password\":\"password123\"}"))
                .andExpect(status().isConflict());

        // Wrong password is rejected, right one works
        mvc.perform(post("/api/auth/signin").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"htet@example.com\",\"password\":\"wrong-password\"}"))
                .andExpect(status().isUnauthorized());
        mvc.perform(post("/api/auth/signin").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"htet@example.com\",\"password\":\"password123\"}"))
                .andExpect(status().isOk());

        // API needs a token
        mvc.perform(get("/api/habits").param("date", today)).andExpect(status().isUnauthorized());

        // Create a habit and check it off
        String habit = mvc.perform(post("/api/habits").param("date", today).header("Authorization", token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Study Java\",\"category\":\"STUDY\",\"color\":\"#2f80ed\",\"goal\":\"45 min\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.doneToday").value(false))
                .andReturn().getResponse().getContentAsString();
        long habitId = json.readTree(habit).get("id").asLong();

        mvc.perform(post("/api/habits/" + habitId + "/toggle").param("date", today).header("Authorization", token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.doneToday").value(true))
                .andExpect(jsonPath("$.streak").value(1));

        // Log mood and read the weekly stats
        mvc.perform(put("/api/mood").header("Authorization", token).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"date\":\"" + today + "\",\"score\":4,\"note\":\"Good day\"}"))
                .andExpect(status().isOk());

        String weekly = mvc.perform(get("/api/stats/weekly").param("date", today).header("Authorization", token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.days.length()").value(7))
                .andExpect(jsonPath("$.checkIns").value(1))
                .andExpect(jsonPath("$.averageMood").value(4.0))
                .andReturn().getResponse().getContentAsString();
        JsonNode lastDay = json.readTree(weekly).get("days").get(6);
        assert lastDay.get("completed").asInt() == 1;

        mvc.perform(get("/api/stats/summary").param("date", today).header("Authorization", token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.currentStreak").value(1))
                .andExpect(jsonPath("$.activeHabits").value(1));
    }

    @Test
    void updateProfileNameEmailAndAvatar() throws Exception {
        String body = mvc.perform(post("/api/auth/signup").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Pat\",\"email\":\"pat@example.com\",\"password\":\"password123\"}"))
                .andReturn().getResponse().getContentAsString();
        String token = "Bearer " + json.readTree(body).get("token").asText();
        String avatar = "data:image/jpeg;base64,/9j/4AAQSkZJRg==";

        // Name and picture change without a password
        mvc.perform(put("/api/auth/me").header("Authorization", token).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Patricia\",\"email\":\"pat@example.com\",\"avatar\":\"" + avatar + "\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Patricia"))
                .andExpect(jsonPath("$.avatar").value(avatar));

        // Omitting avatar keeps it
        mvc.perform(put("/api/auth/me").header("Authorization", token).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Patricia\",\"email\":\"pat@example.com\"}"))
                .andExpect(jsonPath("$.avatar").value(avatar));

        // Non-image data is rejected
        mvc.perform(put("/api/auth/me").header("Authorization", token).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Patricia\",\"email\":\"pat@example.com\",\"avatar\":\"data:text/html;base64,AAAA\"}"))
                .andExpect(status().isBadRequest());

        // Email change needs the right password
        mvc.perform(put("/api/auth/me").header("Authorization", token).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Patricia\",\"email\":\"new@example.com\"}"))
                .andExpect(status().isForbidden());
        mvc.perform(put("/api/auth/me").header("Authorization", token).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Patricia\",\"email\":\"new@example.com\",\"currentPassword\":\"password123\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value("new@example.com"));

        // Taking an existing email is rejected
        mvc.perform(post("/api/auth/signup").contentType(MediaType.APPLICATION_JSON)
                .content("{\"name\":\"Other\",\"email\":\"other@example.com\",\"password\":\"password123\"}"));
        mvc.perform(put("/api/auth/me").header("Authorization", token).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Patricia\",\"email\":\"other@example.com\",\"currentPassword\":\"password123\"}"))
                .andExpect(status().isConflict());

        // Empty string removes the picture
        mvc.perform(put("/api/auth/me").header("Authorization", token).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Patricia\",\"email\":\"new@example.com\",\"avatar\":\"\"}"))
                .andExpect(jsonPath("$.avatar").doesNotExist());
    }

    @Test
    void changePictureOnlyAndPasswordSeparately() throws Exception {
        String body = mvc.perform(post("/api/auth/signup").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Sam\",\"email\":\"sam@example.com\",\"password\":\"password123\"}"))
                .andReturn().getResponse().getContentAsString();
        String token = "Bearer " + json.readTree(body).get("token").asText();
        String avatar = "data:image/png;base64,iVBORw0KGgo=";

        // Picture only: no name or email sent
        mvc.perform(put("/api/auth/me").header("Authorization", token).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"avatar\":\"" + avatar + "\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.name").value("Sam"))
                .andExpect(jsonPath("$.email").value("sam@example.com"))
                .andExpect(jsonPath("$.avatar").value(avatar));

        // Wrong current password, then a correct change
        mvc.perform(put("/api/auth/password").header("Authorization", token).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"currentPassword\":\"nope-nope\",\"newPassword\":\"newpassword1\"}"))
                .andExpect(status().isForbidden());
        mvc.perform(put("/api/auth/password").header("Authorization", token).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"currentPassword\":\"password123\",\"newPassword\":\"newpassword1\"}"))
                .andExpect(status().isNoContent());
        mvc.perform(post("/api/auth/signin").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"sam@example.com\",\"password\":\"newpassword1\"}"))
                .andExpect(status().isOk());
    }
}
