# pii_redaction_service.py
# Redacts PII from transcript text before storage.
# Called AFTER conversation_turns is populated, BEFORE writing to conversations.transcript_json.
# Only active when agent_configs.pii_redaction_enabled = True.

import re
from typing import Any

# PII patterns — extend as required for regional compliance (TRAI, GDPR, TCPA)
PII_PATTERNS = [
    # UK/IN mobile numbers: +447xxx or 07xxx or +919xxx
    (re.compile(r'\b(\+44|0)7\d{9}\b'), '[PHONE_NUMBER]'),
    (re.compile(r'\b(\+91)?[6-9]\d{9}\b'), '[PHONE_NUMBER]'),
    # Generic international E.164
    (re.compile(r'\+[1-9]\d{6,14}\b'), '[PHONE_NUMBER]'),
    # Payment card numbers (16-digit, with or without spaces/dashes)
    (re.compile(r'\b\d{4}[\s\-]?\d{4}[\s\-]?\d{4}[\s\-]?\d{4}\b'), '[CARD_NUMBER]'),
    # UK National Insurance
    (re.compile(r'\b[A-Z]{2}\d{6}[A-D]\b', re.IGNORECASE), '[NI_NUMBER]'),
    # Date of birth patterns: DD/MM/YYYY, MM/DD/YYYY, YYYY-MM-DD
    (re.compile(r'\b\d{1,2}[/\-]\d{1,2}[/\-]\d{4}\b'), '[DOB]'),
    (re.compile(r'\b\d{4}[/\-]\d{1,2}[/\-]\d{1,2}\b'), '[DOB]'),
    # Sort codes (UK banking): 12-34-56
    (re.compile(r'\b\d{2}[\-]\d{2}[\-]\d{2}\b'), '[SORT_CODE]'),
    # Bank account numbers (UK: 8 digits)
    (re.compile(r'\b\d{8}\b'), '[ACCOUNT_NUMBER]'),
    # Email addresses
    (re.compile(r'\b[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Z|a-z]{2,}\b'), '[EMAIL]'),
]


def redact_pii(text: str) -> str:
    """Apply all PII patterns to a text string. Returns redacted version."""
    for pattern, replacement in PII_PATTERNS:
        text = pattern.sub(replacement, text)
    return text


def redact_transcript_json(transcript_json: list[dict[str, Any]]) -> list[dict[str, Any]]:
    """
    Redact PII from all text fields in a conversation turns array.
    transcript_json is a list of {speaker, text, ...} objects.
    Returns a new list with text fields redacted — does not mutate input.
    """
    redacted = []
    for turn in transcript_json:
        turn_copy = dict(turn)
        if 'text' in turn_copy and turn_copy['text']:
            turn_copy['text'] = redact_pii(turn_copy['text'])
        redacted.append(turn_copy)
    return redacted
