package com.lifetrack;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.lifetrack.user.User;
import com.lifetrack.user.UserRepository;
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

/** Points unlock color themes and crowns, which you can then equip: mvn test */
@SpringBootTest
@AutoConfigureMockMvc
@TestPropertySource(properties = "spring.datasource.url=jdbc:h2:mem:lifetrack-reward-test;DB_CLOSE_DELAY=-1")
class RewardFlowTest {

    @Autowired
    MockMvc mvc;

    @Autowired
    ObjectMapper json;

    @Autowired
    UserRepository users;

    @Test
    void pointsUnlockThemesAndCrownsThatCanBeEquipped() throws Exception {
        String today = LocalDate.now().toString();
        JsonNode signUp = json.readTree(mvc.perform(post("/api/auth/signup").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Zed\",\"email\":\"zed@example.com\",\"password\":\"password123\"}"))
                .andExpect(status().isCreated()).andReturn().getResponse().getContentAsString());
        String token = "Bearer " + signUp.get("token").asText();
        long userId = signUp.get("user").get("id").asLong();

        // Starts with 0 points: only the default theme is open
        mvc.perform(get("/api/rewards").header("Authorization", token))
                .andExpect(jsonPath("$.points").value(0))
                .andExpect(jsonPath("$.equippedTheme").value("VIOLET"))
                .andExpect(jsonPath("$.themes[0].unlocked").value(true))
                .andExpect(jsonPath("$.themes[1].unlocked").value(false))
                .andExpect(jsonPath("$.next.id").value("OCEAN"));
        mvc.perform(put("/api/rewards/equip").header("Authorization", token).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"kind\":\"THEME\",\"id\":\"OCEAN\"}"))
                .andExpect(status().isForbidden());

        // A photo in a group is worth 10 points
        long groupId = json.readTree(mvc.perform(post("/api/groups?date=" + today).header("Authorization", token)
                        .contentType(MediaType.APPLICATION_JSON).content("{\"name\":\"Solo\"}"))
                .andReturn().getResponse().getContentAsString()).get("id").asLong();
        mvc.perform(post("/api/groups/" + groupId + "/posts?date=" + today).header("Authorization", token)
                        .contentType(MediaType.APPLICATION_JSON).content("{\"photo\":\"data:image/jpeg;base64,/9j/4AAQ\"}"))
                .andExpect(status().isCreated());
        mvc.perform(get("/api/rewards").header("Authorization", token)).andExpect(jsonPath("$.points").value(10));

        // With 120 points: Ocean and Forest open, Sunset and the gold crown are not
        User user = users.findById(userId).orElseThrow();
        user.raisePoints(120);
        users.save(user);
        mvc.perform(put("/api/rewards/equip").header("Authorization", token).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"kind\":\"THEME\",\"id\":\"FOREST\"}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.equippedTheme").value("FOREST"));
        mvc.perform(put("/api/rewards/equip").header("Authorization", token).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"kind\":\"THEME\",\"id\":\"SUNSET\"}"))
                .andExpect(status().isForbidden());
        mvc.perform(put("/api/rewards/equip").header("Authorization", token).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"kind\":\"CROWN\",\"id\":\"GOLD\"}"))
                .andExpect(status().isForbidden());
        mvc.perform(put("/api/rewards/equip").header("Authorization", token).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"kind\":\"CROWN\",\"id\":\"BRONZE\"}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.equippedCrown").value("BRONZE"));

        // Everyone sees the crown, and the app gets the theme when it loads the profile
        mvc.perform(get("/api/auth/me").header("Authorization", token))
                .andExpect(jsonPath("$.equippedTheme").value("FOREST")).andExpect(jsonPath("$.equippedCrown").value("BRONZE"));
        mvc.perform(get("/api/groups/" + groupId + "/leaderboard?date=" + today).header("Authorization", token))
                .andExpect(jsonPath("$[0].user.crown").value("BRONZE"));

        // Take the crown off, and an unknown reward is rejected
        mvc.perform(put("/api/rewards/equip").header("Authorization", token).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"kind\":\"CROWN\",\"id\":\"NONE\"}"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.equippedCrown").doesNotExist());
        mvc.perform(put("/api/rewards/equip").header("Authorization", token).contentType(MediaType.APPLICATION_JSON)
                        .content("{\"kind\":\"THEME\",\"id\":\"NOPE\"}"))
                .andExpect(status().isNotFound());
    }
}
