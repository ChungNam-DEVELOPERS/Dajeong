/**
 * 이 파일은 Spring OpenAPI 계약에서 자동 생성됩니다.
 * 직접 수정하지 말고 `pnpm generate:api-client`를 실행하세요.
 */

export interface paths {
    "/api/v1/disruptions/{disruptionId}/dismiss": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** 문제 확인 후 원본 일정 유지 */
        post: operations["dismissDisruption"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/disruptions/{disruptionId}/replans": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** 문제 확인 후 재조정 시작 */
        post: operations["startDisruptionReplan"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/invites/{code}/join": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** 초대 코드로 여행 가입 */
        post: operations["joinTripByInvite"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/me": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** 현재 사용자 조회 */
        get: operations["getCurrentUser"];
        put?: never;
        post?: never;
        /** 현재 사용자 계정 삭제 */
        delete: operations["deleteCurrentUser"];
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/system/health": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** 시스템 상태 확인 */
        get: operations["getSystemHealth"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/trips": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** 내 여행 목록 */
        get: operations["listTrips"];
        put?: never;
        /** 여행 생성 */
        post: operations["createTrip"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/trips/{tripId}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** 내 여행 상세 조회 */
        get: operations["getTrip"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/trips/{tripId}/disruptions": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** 여행 문제 목록 */
        get: operations["listDisruptions"];
        put?: never;
        /** 수동 문제 신고 */
        post: operations["createDisruption"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/trips/{tripId}/invites": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** 여행 초대 발급 */
        post: operations["issueTripInvite"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/trips/{tripId}/itineraries/current": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** 최신 확정 일정 조회 */
        get: operations["getCurrentItinerary"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/trips/{tripId}/itineraries/draft": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** 방장 일정 초안 조회 */
        get: operations["getItineraryDraft"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/trips/{tripId}/itineraries/draft/publish": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** 일정 초안을 불변 버전으로 발행 */
        post: operations["publishItineraryDraft"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/trips/{tripId}/itineraries/draft/slots": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** 일정 초안 슬롯 추가 */
        post: operations["addItineraryDraftSlot"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/trips/{tripId}/itineraries/draft/slots/{slotId}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        /** 일정 초안 슬롯 삭제 */
        delete: operations["deleteItineraryDraftSlot"];
        options?: never;
        head?: never;
        /** 일정 초안 슬롯 수정 */
        patch: operations["updateItineraryDraftSlot"];
        trace?: never;
    };
    "/api/v1/trips/{tripId}/preferences/me": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** 내 비공개 선호 조회 */
        get: operations["getMyPrivatePreference"];
        /** 내 비공개 선호 저장 */
        put: operations["saveMyPrivatePreference"];
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/api/v1/trips/{tripId}/preferences/status": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** 멤버별 선호 제출 여부 조회 */
        get: operations["getPreferenceSubmissionStatus"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
}
export type webhooks = Record<string, never>;
export interface components {
    schemas: {
        ApiErrorResponse: {
            code: string;
            message: string;
        };
        CreateDisruptionRequest: {
            description: string;
            /** Format: uuid */
            itinerarySlotId: string;
            /** @enum {string} */
            type: "CLOSURE" | "TRAFFIC" | "OTHER";
        };
        CreateTripRequest: {
            /**
             * Format: date
             * @example 2026-08-23
             */
            endDate: string;
            /**
             * Format: date
             * @example 2026-08-21
             */
            startDate: string;
            /** @example 대전 여름 여행 */
            title: string;
        };
        /** @description 현재 로그인한 내부 사용자 */
        CurrentUserResponse: {
            /** Format: date-time */
            createdAt: string;
            displayName: string;
            /** Format: uuid */
            id: string;
            /** @enum {string} */
            status: "ACTIVE" | "DELETED";
        };
        DisruptionListResponse: {
            disruptions: components["schemas"]["DisruptionResponse"][];
            /** Format: uuid */
            tripId: string;
        };
        DisruptionResponse: {
            description: string;
            /** Format: uuid */
            id: string;
            /** Format: uuid */
            itinerarySlotId: string;
            /** Format: uuid */
            itineraryVersionId: string;
            /** Format: int32 */
            itineraryVersionNumber: number;
            placeName: string;
            /** Format: date-time */
            reportedAt: string;
            /** Format: uuid */
            reportedByUserId: string;
            reporterDisplayName: string;
            /** Format: date-time */
            slotEndsAt: string;
            /** Format: date-time */
            slotStartsAt: string;
            /** @enum {string} */
            status: "DETECTED" | "ACKNOWLEDGED" | "DISMISSED";
            /** Format: uuid */
            tripId: string;
            /** @enum {string} */
            type: "CLOSURE" | "TRAFFIC" | "OTHER";
            /** Format: date-time */
            updatedAt: string;
        };
        InviteResponse: {
            code: string;
            /** Format: date-time */
            expiresAt: string;
        };
        ItineraryDraftResponse: {
            /** Format: int64 */
            publishedRevision?: number | null;
            /** Format: int64 */
            revision: number;
            slots: components["schemas"]["ItinerarySlotResponse"][];
            /** Format: uuid */
            tripId: string;
        };
        ItinerarySlotRequest: {
            /** @example 대전 유성구 대덕대로 481 */
            address: string;
            /**
             * @example CULTURE
             * @enum {string}
             */
            category: "MEAL" | "CAFE" | "CULTURE" | "ACTIVITY" | "SHOPPING" | "TRANSIT" | "OTHER";
            /**
             * Format: date-time
             * @example 2026-09-01T11:30:00+09:00
             */
            endsAt: string;
            /**
             * Format: int32
             * @example 3000
             */
            expectedCost: number;
            /** @example true */
            indoor: boolean;
            /** @example 36.3741 */
            latitude?: number | null;
            /** @example 127.3778 */
            longitude?: number | null;
            /** @example 국립중앙과학관 */
            placeName: string;
            /**
             * Format: date-time
             * @example 2026-09-01T10:00:00+09:00
             */
            startsAt: string;
        };
        ItinerarySlotResponse: {
            address: string;
            /** @enum {string} */
            category: "MEAL" | "CAFE" | "CULTURE" | "ACTIVITY" | "SHOPPING" | "TRANSIT" | "OTHER";
            /** Format: date-time */
            endsAt: string;
            /** Format: int32 */
            expectedCost: number;
            /** Format: uuid */
            id: string;
            indoor: boolean;
            latitude?: number | null;
            longitude?: number | null;
            placeName: string;
            /** Format: date-time */
            startsAt: string;
        };
        ItineraryVersionResponse: {
            /** Format: int64 */
            draftRevision: number;
            /** Format: uuid */
            id: string;
            /** Format: int32 */
            previousVersionNumber?: number | null;
            /** Format: date-time */
            publishedAt: string;
            /** @enum {string} */
            reason: "ORIGINAL";
            slots: components["schemas"]["ItinerarySlotResponse"][];
            /** Format: uuid */
            tripId: string;
            /** Format: int32 */
            versionNumber: number;
        };
        PreferenceMemberStatusResponse: {
            displayName: string;
            /** Format: uuid */
            memberId: string;
            /** @enum {string} */
            role: "HOST" | "MEMBER";
            submitted: boolean;
        };
        PreferenceStatusResponse: {
            members: components["schemas"]["PreferenceMemberStatusResponse"][];
            /** Format: int32 */
            submittedCount: number;
            /** Format: int32 */
            totalCount: number;
            /** Format: uuid */
            tripId: string;
        };
        PrivatePreferenceRequest: {
            /**
             * Format: int32
             * @example 3
             */
            activityLevel: number;
            /**
             * Format: int32
             * @example 50000
             */
            budgetPerPerson: number;
            preferredCategories: ("NATURE" | "FOOD" | "CAFE" | "CULTURE" | "SHOPPING" | "ACTIVITY" | "EXPERIENCE")[];
            priorities: ("FLEXIBLE_SCHEDULE" | "NATURE_HEALING" | "FOOD_EXPLORATION" | "MINIMIZE_TRAVEL" | "SAVE_BUDGET")[];
            /**
             * Format: int32
             * @example 2
             */
            travelTolerance: number;
        };
        PrivatePreferenceResponse: {
            /** Format: int32 */
            activityLevel: number;
            /** Format: int32 */
            budgetPerPerson: number;
            preferredCategories: ("NATURE" | "FOOD" | "CAFE" | "CULTURE" | "SHOPPING" | "ACTIVITY" | "EXPERIENCE")[];
            priorities: ("FLEXIBLE_SCHEDULE" | "NATURE_HEALING" | "FOOD_EXPLORATION" | "MINIMIZE_TRAVEL" | "SAVE_BUDGET")[];
            /** Format: date-time */
            submittedAt: string;
            /** Format: int32 */
            travelTolerance: number;
            /** Format: uuid */
            tripId: string;
            /** Format: date-time */
            updatedAt: string;
            /** Format: uuid */
            userId: string;
        };
        SystemHealthResponse: {
            /** @enum {string} */
            database: "UP" | "DOWN";
            /** @enum {string} */
            status: "UP" | "DOWN";
        };
        TripListResponse: {
            items: components["schemas"]["TripSummaryResponse"][];
            nextCursor?: string;
        };
        TripSummaryResponse: {
            /** Format: date-time */
            createdAt: string;
            /** Format: date */
            endDate: string;
            /** Format: uuid */
            id: string;
            /** @enum {string} */
            region: "DAEJEON";
            /** @enum {string} */
            role: "HOST" | "MEMBER";
            /** Format: date */
            startDate: string;
            /** @enum {string} */
            status: "DRAFT" | "ACTIVE" | "COMPLETED" | "ARCHIVED";
            title: string;
        };
    };
    responses: never;
    parameters: never;
    requestBodies: never;
    headers: never;
    pathItems: never;
}
export type $defs = Record<string, never>;
export interface operations {
    dismissDisruption: {
        parameters: {
            query?: never;
            header: {
                "Idempotency-Key": string;
            };
            path: {
                disruptionId: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["DisruptionResponse"];
                };
            };
        };
    };
    startDisruptionReplan: {
        parameters: {
            query?: never;
            header: {
                "Idempotency-Key": string;
            };
            path: {
                disruptionId: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description 재조정 시작을 확인한 문제 */
            202: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["DisruptionResponse"];
                };
            };
            /** @description 인증되지 않은 요청 */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description 활성 멤버십 없음 */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description 이미 처리된 문제 */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    joinTripByInvite: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                code: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description 이미 가입한 여행 반환 */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["TripSummaryResponse"];
                };
            };
            /** @description 새 MEMBER 멤버십 생성 */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["TripSummaryResponse"];
                };
            };
            /** @description 인증되지 않은 요청 */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description 여행 정원 초과 */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiErrorResponse"];
                };
            };
            /** @description 만료 또는 폐기된 초대 */
            410: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiErrorResponse"];
                };
            };
            /** @description 여행 저장소 사용 불가 */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    getCurrentUser: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description 현재 사용자를 조회하거나 처음 생성함 */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["CurrentUserResponse"];
                };
            };
            /** @description 인증되지 않은 요청 */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description 이미 삭제된 계정 */
            410: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiErrorResponse"];
                };
            };
            /** @description 사용자 저장소를 사용할 수 없음 */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    deleteCurrentUser: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description 계정 개인정보와 활성 도메인 관계 삭제 */
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description 인증되지 않은 요청 */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description 사용자 저장소를 사용할 수 없음 */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    getSystemHealth: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description 데이터베이스와 스키마가 준비됨 */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SystemHealthResponse"];
                };
            };
            /** @description 데이터베이스 또는 스키마를 사용할 수 없음 */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SystemHealthResponse"];
                };
            };
        };
    };
    listTrips: {
        parameters: {
            query?: {
                cursor?: string;
                limit?: number;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description 현재 사용자의 활성 여행 목록 */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["TripListResponse"];
                };
            };
            /** @description 잘못된 cursor 또는 limit */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description 인증되지 않은 요청 */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description 여행 저장소 사용 불가 */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    createTrip: {
        parameters: {
            query?: never;
            header: {
                "Idempotency-Key": string;
            };
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CreateTripRequest"];
            };
        };
        responses: {
            /** @description 동일한 멱등 요청으로 생성된 여행 반환 */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["TripSummaryResponse"];
                };
            };
            /** @description 여행과 방장 멤버십 생성 */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["TripSummaryResponse"];
                };
            };
            /** @description 잘못된 생성 요청 */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description 인증되지 않은 요청 */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description 멱등 키 재사용 충돌 */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description 여행 저장소 사용 불가 */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    getTrip: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                tripId: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description 활성 멤버십이 있는 여행 */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["TripSummaryResponse"];
                };
            };
            /** @description 인증되지 않은 요청 */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description 활성 멤버십 없음 */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiErrorResponse"];
                };
            };
            /** @description 여행 저장소 사용 불가 */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    listDisruptions: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                tripId: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description OK */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["DisruptionListResponse"];
                };
            };
        };
    };
    createDisruption: {
        parameters: {
            query?: never;
            header: {
                "Idempotency-Key": string;
            };
            path: {
                tripId: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["CreateDisruptionRequest"];
            };
        };
        responses: {
            /** @description 멱등 요청 재응답 */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["DisruptionResponse"];
                };
            };
            /** @description 문제 신고 생성 */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["DisruptionResponse"];
                };
            };
            /** @description 잘못된 신고 입력 */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description 인증되지 않은 요청 */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description 활성 멤버십 없음 */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description 현재 일정 슬롯 없음 */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description 종료 여행 또는 멱등 충돌 */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiErrorResponse"];
                };
            };
        };
    };
    issueTripInvite: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                tripId: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description 새 7일 초대 코드 발급 */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["InviteResponse"];
                };
            };
            /** @description 인증되지 않은 요청 */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description 방장 권한 없음 */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiErrorResponse"];
                };
            };
            /** @description 여행 저장소 사용 불가 */
            503: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    getCurrentItinerary: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                tripId: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description 최신 불변 일정 버전 */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ItineraryVersionResponse"];
                };
            };
            /** @description 인증되지 않은 요청 */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description 활성 멤버십 없음 */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiErrorResponse"];
                };
            };
            /** @description 발행된 일정 없음 */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiErrorResponse"];
                };
            };
        };
    };
    getItineraryDraft: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                tripId: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description 현재 일정 초안 */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ItineraryDraftResponse"];
                };
            };
            /** @description 인증되지 않은 요청 */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description 방장 권한 없음 */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiErrorResponse"];
                };
            };
        };
    };
    publishItineraryDraft: {
        parameters: {
            query?: never;
            header: {
                "If-Match": string;
                "Idempotency-Key": string;
            };
            path: {
                tripId: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description 동일한 멱등 발행 결과 반환 */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ItineraryVersionResponse"];
                };
            };
            /** @description 새 일정 버전 발행 */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ItineraryVersionResponse"];
                };
            };
            /** @description 빈 일정 */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description 인증되지 않은 요청 */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description 방장 권한 없음 */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description 오래된 revision, 무변경 또는 멱등 충돌 */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiErrorResponse"];
                };
            };
        };
    };
    addItineraryDraftSlot: {
        parameters: {
            query?: never;
            header: {
                "If-Match": string;
                "Idempotency-Key": string;
            };
            path: {
                tripId: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ItinerarySlotRequest"];
            };
        };
        responses: {
            /** @description 동일한 멱등 요청 결과 반환 */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ItineraryDraftResponse"];
                };
            };
            /** @description 새 초안 슬롯 생성 */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ItineraryDraftResponse"];
                };
            };
            /** @description 잘못된 슬롯 */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description 인증되지 않은 요청 */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description 방장 권한 없음 */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description 오래된 revision 또는 멱등 충돌 */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiErrorResponse"];
                };
            };
        };
    };
    deleteItineraryDraftSlot: {
        parameters: {
            query?: never;
            header: {
                "If-Match": string;
            };
            path: {
                tripId: string;
                slotId: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description 삭제 후 일정 초안 */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ItineraryDraftResponse"];
                };
            };
            /** @description 인증되지 않은 요청 */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description 방장 권한 없음 */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description 슬롯 없음 */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description 오래된 revision */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiErrorResponse"];
                };
            };
        };
    };
    updateItineraryDraftSlot: {
        parameters: {
            query?: never;
            header: {
                "If-Match": string;
            };
            path: {
                tripId: string;
                slotId: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ItinerarySlotRequest"];
            };
        };
        responses: {
            /** @description 수정된 일정 초안 */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ItineraryDraftResponse"];
                };
            };
            /** @description 잘못된 슬롯 */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description 인증되지 않은 요청 */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description 방장 권한 없음 */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description 슬롯 없음 */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description 오래된 revision */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiErrorResponse"];
                };
            };
        };
    };
    getMyPrivatePreference: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                tripId: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description 현재 로그인 멤버의 원본 선호 */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PrivatePreferenceResponse"];
                };
            };
            /** @description 인증되지 않은 요청 */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description 활성 멤버십 없음 */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description 아직 제출한 선호 없음 */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiErrorResponse"];
                };
            };
        };
    };
    saveMyPrivatePreference: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                tripId: string;
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["PrivatePreferenceRequest"];
            };
        };
        responses: {
            /** @description 저장된 현재 로그인 멤버의 원본 선호 */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PrivatePreferenceResponse"];
                };
            };
            /** @description 잘못된 선호 입력 */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description 인증되지 않은 요청 */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description 활성 멤버십 없음 */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description 선호 변경이 종료된 여행 */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ApiErrorResponse"];
                };
            };
        };
    };
    getPreferenceSubmissionStatus: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                tripId: string;
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description 원본 선호를 제외한 활성 멤버별 제출 여부 */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PreferenceStatusResponse"];
                };
            };
            /** @description 인증되지 않은 요청 */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description 활성 멤버십 없음 */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
}
