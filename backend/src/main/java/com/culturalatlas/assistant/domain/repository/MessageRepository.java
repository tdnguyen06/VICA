package com.culturalatlas.assistant.domain.repository;

import com.culturalatlas.assistant.domain.entity.Message;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface MessageRepository extends JpaRepository<Message, Long> {

    List<Message> findByConversationIdOrderBySequenceNumberAsc(Long conversationId);

    int countByConversationId(Long conversationId);

    @Query("SELECT COALESCE(MAX(m.sequenceNumber), 0) FROM Message m WHERE m.conversation.id = :conversationId")
    Integer findMaxSequenceNumberByConversationId(@Param("conversationId") Long conversationId);
}
