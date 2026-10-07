package com.lifetrack.common;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

/**
 * When the React app is built into src/main/resources/static, refreshing a page like /habits
 * should still load the app instead of a 404.
 */
@Controller
public class SpaController {

    @GetMapping({"/signin", "/signup", "/habits", "/stats", "/me"})
    public String forwardToApp() {
        return "forward:/index.html";
    }
}
