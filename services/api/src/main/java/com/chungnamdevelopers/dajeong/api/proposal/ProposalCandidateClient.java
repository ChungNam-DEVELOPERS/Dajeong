package com.chungnamdevelopers.dajeong.api.proposal;

import java.util.List;

public interface ProposalCandidateClient {

    List<ProposalCandidate> search(ProposalSearchRequest request);
}
