/**
 * 이 파일은 Spring OpenAPI 계약에서 자동 생성됩니다.
 * 직접 수정하지 말고 `pnpm generate:api-client`를 실행하세요.
 */

export interface paths {
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
}
export type webhooks = Record<string, never>;
export interface components {
    schemas: {
        ApiErrorResponse: {
            code: string;
            message: string;
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
}
