package com.lifetrack.backup;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.annotation.Profile;
import org.springframework.context.event.EventListener;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.stream.Stream;

/**
 * Local H2 only: saves a full SQL copy of the database to backend/backups/ on startup and
 * every night, while the app keeps running. The newest copies are kept, older ones deleted.
 * Restore: run the .sql file in the H2 console (or RUNSCRIPT FROM 'file') on an empty database.
 */
@Component
@Profile("!prod")
public class DatabaseBackup {

    private static final Logger log = LoggerFactory.getLogger(DatabaseBackup.class);
    private static final DateTimeFormatter STAMP = DateTimeFormatter.ofPattern("yyyy-MM-dd_HH-mm-ss");

    private final JdbcTemplate jdbc;
    private final boolean fileDatabase;
    private final Path folder;
    private final int keep;

    public DatabaseBackup(JdbcTemplate jdbc,
                          @Value("${spring.datasource.url}") String url,
                          @Value("${lifetrack.backup.folder:./backups}") String folder,
                          @Value("${lifetrack.backup.keep:14}") int keep) {
        this.jdbc = jdbc;
        this.fileDatabase = url.startsWith("jdbc:h2:file:");
        this.folder = Path.of(folder).toAbsolutePath().normalize();
        this.keep = keep;
    }

    @EventListener(ApplicationReadyEvent.class)
    public void onStartup() {
        backup();
    }

    @Scheduled(cron = "${lifetrack.backup.cron:0 0 3 * * *}")
    public void nightly() {
        backup();
    }

    public void backup() {
        if (!fileDatabase) {
            return;
        }
        try {
            Files.createDirectories(folder);
            Path target = folder.resolve("lifetrack-" + LocalDateTime.now().format(STAMP) + ".sql");
            jdbc.execute("SCRIPT TO '" + target.toString().replace("'", "''") + "'");
            log.info("Database backup saved: {}", target);
            prune();
        } catch (Exception e) {
            log.warn("Database backup failed: {}", e.getMessage());
        }
    }

    private void prune() throws IOException {
        try (Stream<Path> files = Files.list(folder)) {
            List<Path> old = files
                    .filter(p -> p.getFileName().toString().matches("lifetrack-.*\\.sql"))
                    .sorted()
                    .toList();
            for (int i = 0; i < old.size() - keep; i++) {
                Files.deleteIfExists(old.get(i));
            }
        }
    }
}
