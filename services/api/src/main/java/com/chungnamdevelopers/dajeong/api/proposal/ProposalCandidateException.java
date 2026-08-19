package com.chungnamdevelopers.dajeong.api.proposal;

public class ProposalCandidateException extends RuntimeException {

    public ProposalCandidateException(String message) {
        super(message);
    }

    public ProposalCandidateException(String message, Throwable cause) {
        super(message, cause);
    }
}
