package com.culturalatlas.auth.service;

import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

/**
 * Sends plain-text mail. Dev mode (app.mail.enabled=false or no SMTP host configured): the message is
 * written to the log instead, so verification and reset codes can be read from the backend console.
 */
@Service
@RequiredArgsConstructor
public class EmailService {
    private static final Logger LOG = LoggerFactory.getLogger(EmailService.class);

    private final ObjectProvider<JavaMailSender> mailSenderProvider;

    @Value("${app.mail.enabled:false}")
    private boolean enabled;

    @Value("${app.mail.from:no-reply@vica.local}")
    private String from;

    public void send(String to, String subject, String body) {
        JavaMailSender sender = mailSenderProvider.getIfAvailable();
        if (enabled && sender != null) {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(from);
            message.setTo(to);
            message.setSubject(subject);
            message.setText(body);
            sender.send(message);
            LOG.info("Email sent to {} (subject: {})", to, subject);
        } else {
            LOG.info("[DEV EMAIL] to={} | subject={} | body={}", to, subject, body);
        }
    }
}