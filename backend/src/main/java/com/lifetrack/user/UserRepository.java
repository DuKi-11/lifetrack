package com.lifetrack.user;

import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {

    Optional<User> findByEmailIgnoreCase(String email);

    boolean existsByEmailIgnoreCase(String email);

    /** People whose name or email contains the text, or whose id is idMatch (-1 for none). Never the user themself. */
    @Query("select u from User u where u.id <> :me and (u.id = :idMatch "
            + "or lower(u.name) like lower(concat('%', :q, '%')) or lower(u.email) like lower(concat('%', :q, '%'))) "
            + "order by u.name")
    List<User> search(@Param("me") Long me, @Param("q") String q, @Param("idMatch") Long idMatch, Pageable page);
}
