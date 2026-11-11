package com.culturalatlas.assistant.domain.repository;

import com.culturalatlas.assistant.domain.entity.Conversation;
import com.culturalatlas.assistant.domain.enums.OwnerType;
import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface ConversationRepository extends JpaRepository<Conversation, Long> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT c FROM Conversation c WHERE c.id = :id")
    Optional<Conversation> findByIdForUpdate(@Param("id") Long id);

    Optional<Conversation> findByIdAndOwnerTypeAndUserId(Long id, OwnerType ownerType, Long userId);

    Optional<Conversation> findByIdAndOwnerTypeAndSessionUuidAndGuestTokenHash(
            Long id, OwnerType ownerType, UUID sessionUuid, String guestTokenHash);

    Optional<Conversation> findBySessionUuidAndGuestTokenHash(UUID sessionUuid, String guestTokenHash);

    Page<Conversation> findByOwnerTypeAndUserIdOrderByUpdatedAtDesc(OwnerType ownerType, Long userId, Pageable pageable);

    Page<Conversation> findByOwnerTypeAndSessionUuidAndGuestTokenHashOrderByUpdatedAtDesc(
            OwnerType ownerType, UUID sessionUuid, String guestTokenHash, Pageable pageable);
}
