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

/** Friends, a shared group, daily photo posts, likes and the group streak: mvn test */
@SpringBootTest
@AutoConfigureMockMvc
@TestPropertySource(properties = "spring.datasource.url=jdbc:h2:mem:lifetrack-community-test;DB_CLOSE_DELAY=-1")
class CommunityFlowTest {

    private static final String PHOTO = "data:image/jpeg;base64,/9j/4AAQSkZJRg==";

    @Autowired
    MockMvc mvc;

    @Autowired
    ObjectMapper json;

    @Test
    void friendsShareAGroupAndKeepAStreakTogether() throws Exception {
        String today = LocalDate.now().toString();
        String yesterday = LocalDate.now().minusDays(1).toString();

        String[] ann = signUp("Ann", "ann@example.com");
        String[] ben = signUp("Ben", "ben@example.com");
        String annToken = ann[0], benToken = ben[0];
        long benId = Long.parseLong(ben[1]);

        long groupId = json.readTree(mvc.perform(post("/api/groups?date=" + yesterday).header("Authorization", annToken)
                        .contentType(MediaType.APPLICATION_JSON).content("{\"name\":\"Gym buddies\",\"goal\":\"Workout photo\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.memberCount").value(1))
                .andReturn().getResponse().getContentAsString()).get("id").asLong();

        // Search finds other users by name or email (never yourself) and needs 2+ characters
        mvc.perform(get("/api/friends/search?q=be").header("Authorization", annToken))
                .andExpect(jsonPath("$.length()").value(1)).andExpect(jsonPath("$[0].name").value("Ben"));
        mvc.perform(get("/api/friends/search?q=ann@").header("Authorization", annToken)).andExpect(jsonPath("$.length()").value(0));
        mvc.perform(get("/api/friends/search?q=b").header("Authorization", annToken)).andExpect(jsonPath("$.length()").value(0));
        // ...or by user id, with or without the #
        mvc.perform(get("/api/friends/search").param("q", "#" + benId).header("Authorization", annToken))
                .andExpect(jsonPath("$.length()").value(1)).andExpect(jsonPath("$[0].name").value("Ben"));
        mvc.perform(get("/api/friends/search?q=" + benId).header("Authorization", annToken))
                .andExpect(jsonPath("$[0].id").value(benId));

        // Friend request: Ann adds Ben by his user id, Ben accepts
        mvc.perform(post("/api/friends/requests").header("Authorization", annToken)
                        .contentType(MediaType.APPLICATION_JSON).content("{\"userId\":" + benId + "}"))
                .andExpect(status().isCreated());
        mvc.perform(post("/api/friends/requests").header("Authorization", annToken)
                        .contentType(MediaType.APPLICATION_JSON).content("{\"email\":\"ben@example.com\"}"))
                .andExpect(status().isConflict());
        long friendshipId = json.readTree(mvc.perform(get("/api/friends").header("Authorization", benToken))
                .andExpect(jsonPath("$.incoming[0].user.name").value("Ann"))
                .andReturn().getResponse().getContentAsString()).get("incoming").get(0).get("friendshipId").asLong();
        mvc.perform(post("/api/friends/" + friendshipId + "/accept").header("Authorization", benToken)).andExpect(status().isOk());
        mvc.perform(get("/api/friends").header("Authorization", annToken))
                .andExpect(jsonPath("$.friends[0].user.name").value("Ben"));

        // Ann invites Ben; Ben sees the invitation, can't see inside yet, then accepts
        mvc.perform(post("/api/groups/" + groupId + "/invites").header("Authorization", annToken)
                        .contentType(MediaType.APPLICATION_JSON).content("{\"userId\":" + benId + "}"))
                .andExpect(status().isCreated());
        mvc.perform(get("/api/groups?date=" + today).header("Authorization", benToken))
                .andExpect(jsonPath("$[0].myStatus").value("INVITED"))
                .andExpect(jsonPath("$[0].invitedBy.name").value("Ann"));
        mvc.perform(post("/api/groups/" + groupId + "/posts?date=" + today).header("Authorization", benToken)
                        .contentType(MediaType.APPLICATION_JSON).content("{\"photo\":\"" + PHOTO + "\"}"))
                .andExpect(status().isNotFound());
        mvc.perform(post("/api/groups/" + groupId + "/accept?date=" + today).header("Authorization", benToken))
                .andExpect(status().isOk());

        // Ann posted yesterday (alone, before Ben joined): the group had a 1-day streak
        postPhoto(annToken, groupId, yesterday);
        mvc.perform(get("/api/groups?date=" + today).header("Authorization", annToken))
                .andExpect(jsonPath("$[0].groupStreak").value(1))
                .andExpect(jsonPath("$[0].myStreak").value(1))
                .andExpect(jsonPath("$[0].allPostedToday").value(false));

        // Ann posts today, Ben hasn't yet: Ann's own streak grows, the group's streak waits for Ben
        long annPost = postPhoto(annToken, groupId, today);
        mvc.perform(get("/api/groups?date=" + today).header("Authorization", annToken))
                .andExpect(jsonPath("$[0].postedToday").value(1))
                .andExpect(jsonPath("$[0].myStreak").value(2))
                .andExpect(jsonPath("$[0].groupStreak").value(1));

        // Ben posts too: everyone posted, so the group streak goes up
        postPhoto(benToken, groupId, today);
        mvc.perform(get("/api/groups?date=" + today).header("Authorization", benToken))
                .andExpect(jsonPath("$[0].allPostedToday").value(true))
                .andExpect(jsonPath("$[0].groupStreak").value(2))
                .andExpect(jsonPath("$[0].myStreak").value(1));

        // Ben likes Ann's post, then un-likes it
        mvc.perform(post("/api/groups/posts/" + annPost + "/like").header("Authorization", benToken))
                .andExpect(jsonPath("$.liked").value(true)).andExpect(jsonPath("$.likeCount").value(1));
        // Leaderboard: Ann has 2 photos + 1 like (22 pts), Ben 1 photo (10 pts). Outsiders can't see it.
        mvc.perform(get("/api/groups/" + groupId + "/leaderboard?date=" + today).header("Authorization", benToken))
                .andExpect(jsonPath("$.length()").value(2))
                .andExpect(jsonPath("$[0].user.name").value("Ann")).andExpect(jsonPath("$[0].rank").value(1))
                .andExpect(jsonPath("$[0].points").value(22)).andExpect(jsonPath("$[0].photos").value(2))
                .andExpect(jsonPath("$[0].likes").value(1)).andExpect(jsonPath("$[0].streak").value(2))
                .andExpect(jsonPath("$[1].user.name").value("Ben")).andExpect(jsonPath("$[1].rank").value(2))
                .andExpect(jsonPath("$[1].points").value(10));
        mvc.perform(get("/api/groups/" + groupId + "/leaderboard?date=" + today + "&period=all").header("Authorization", annToken))
                .andExpect(jsonPath("$[0].points").value(22));

        // Liking your own photo doesn't add points
        mvc.perform(post("/api/groups/posts/" + annPost + "/like").header("Authorization", annToken)).andExpect(status().isOk());
        mvc.perform(get("/api/groups/" + groupId + "/leaderboard?date=" + today).header("Authorization", annToken))
                .andExpect(jsonPath("$[0].likes").value(1)).andExpect(jsonPath("$[0].points").value(22));
        mvc.perform(post("/api/groups/posts/" + annPost + "/like").header("Authorization", annToken)).andExpect(status().isOk());

        mvc.perform(get("/api/groups/" + groupId + "?date=" + today).header("Authorization", annToken))
                .andExpect(jsonPath("$.members.length()").value(2))
                .andExpect(jsonPath("$.posts.length()").value(3))
                .andExpect(jsonPath("$.posts[?(@.id==" + annPost + ")].likeCount").value(1));
        mvc.perform(post("/api/groups/posts/" + annPost + "/like").header("Authorization", benToken))
                .andExpect(jsonPath("$.liked").value(false)).andExpect(jsonPath("$.likeCount").value(0));

        // Strangers can't see the group or like its posts
        String[] cat = signUp("Cat", "cat@example.com");
        mvc.perform(get("/api/groups/" + groupId + "?date=" + today).header("Authorization", cat[0])).andExpect(status().isNotFound());
        mvc.perform(get("/api/groups/" + groupId + "/leaderboard?date=" + today).header("Authorization", cat[0])).andExpect(status().isNotFound());
        mvc.perform(post("/api/groups/posts/" + annPost + "/like").header("Authorization", cat[0])).andExpect(status().isNotFound());

        // A non-photo is rejected, only the owner can delete, and the owner can't just leave
        mvc.perform(post("/api/groups/" + groupId + "/posts?date=" + today).header("Authorization", annToken)
                        .contentType(MediaType.APPLICATION_JSON).content("{\"photo\":\"hello\"}"))
                .andExpect(status().isBadRequest());
        mvc.perform(delete("/api/groups/" + groupId).header("Authorization", benToken)).andExpect(status().isForbidden());
        mvc.perform(post("/api/groups/" + groupId + "/leave").header("Authorization", annToken)).andExpect(status().isBadRequest());
        mvc.perform(post("/api/groups/" + groupId + "/leave").header("Authorization", benToken)).andExpect(status().isNoContent());
        mvc.perform(delete("/api/groups/" + groupId).header("Authorization", annToken)).andExpect(status().isNoContent());
        mvc.perform(get("/api/groups?date=" + today).header("Authorization", annToken)).andExpect(jsonPath("$.length()").value(0));
    }

    private long postPhoto(String token, long groupId, String day) throws Exception {
        String body = mvc.perform(post("/api/groups/" + groupId + "/posts?date=" + day).header("Authorization", token)
                        .contentType(MediaType.APPLICATION_JSON).content("{\"photo\":\"" + PHOTO + "\",\"caption\":\"done\"}"))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        return json.readTree(body).get("id").asLong();
    }

    /** Returns {"Bearer <token>", "<userId>"}. */
    private String[] signUp(String name, String email) throws Exception {
        String body = mvc.perform(post("/api/auth/signup").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"" + name + "\",\"email\":\"" + email + "\",\"password\":\"password123\"}"))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        JsonNode node = json.readTree(body);
        return new String[]{"Bearer " + node.get("token").asText(), node.get("user").get("id").asText()};
    }
}
