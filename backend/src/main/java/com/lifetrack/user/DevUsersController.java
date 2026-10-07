package com.lifetrack.user;

import org.springframework.context.annotation.Profile;
import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.util.HtmlUtils;

/**
 * Local-only page that lists the accounts that have signed up: http://localhost:8080/dev/users
 * Not available when running with the prod profile. Password hashes are never shown.
 */
@RestController
@Profile("!prod")
public class DevUsersController {

    private final UserRepository users;

    public DevUsersController(UserRepository users) {
        this.users = users;
    }

    @GetMapping(value = "/dev/users", produces = MediaType.TEXT_HTML_VALUE)
    public String list() {
        StringBuilder rows = new StringBuilder();
        for (User u : users.findAll()) {
            rows.append("<tr><td>").append(u.getId())
                    .append("</td><td>").append(HtmlUtils.htmlEscape(u.getName()))
                    .append("</td><td>").append(HtmlUtils.htmlEscape(u.getEmail()))
                    .append("</td><td>").append(u.getCreatedAt())
                    .append("</td></tr>");
        }
        return "<!doctype html><meta charset=utf-8><title>LifeTrack users</title>"
                + "<style>body{font:15px system-ui;margin:2rem}table{border-collapse:collapse}"
                + "td,th{border:1px solid #ccc;padding:6px 12px;text-align:left}</style>"
                + "<h2>Accounts (dev only)</h2><table><tr><th>ID</th><th>Name</th><th>Email</th><th>Created</th></tr>"
                + rows + "</table>";
    }
}
