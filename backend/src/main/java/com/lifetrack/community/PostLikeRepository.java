package com.lifetrack.community;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface PostLikeRepository extends JpaRepository<PostLike, Long> {

    List<PostLike> findByPostIdIn(Collection<Long> postIds);

    Optional<PostLike> findByPostIdAndUserId(Long postId, Long userId);

    long countByPostId(Long postId);

    /** Likes each member's photos in this group received from OTHER people since `from`. Rows are [authorUserId, count]. */
    @Query("select p.userId, count(l) from PostLike l, GroupPost p "
            + "where l.postId = p.id and l.userId <> p.userId and p.groupId = :groupId and p.postDay >= :from group by p.userId")
    List<Object[]> countLikesReceived(@Param("groupId") Long groupId, @Param("from") java.time.LocalDate from);

    /** Likes the user's photos got from other people, in every group. */
    @Query("select count(l) from PostLike l, GroupPost p where l.postId = p.id and p.userId = :userId and l.userId <> :userId")
    long countLikesReceivedBy(@Param("userId") Long userId);

    @Modifying
    @Query("delete from PostLike l where l.postId = :postId")
    void deleteByPostId(@Param("postId") Long postId);

    @Modifying
    @Query("delete from PostLike l where l.postId in (select p.id from GroupPost p where p.groupId = :groupId)")
    void deleteByGroupId(@Param("groupId") Long groupId);
}
