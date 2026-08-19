package com.chungnamdevelopers.dajeong.api.proposal;

public record VoteDeadlineBatchResult(
        int scannedCount,
        int appliedCount,
        int cancelledCount
) {
}
