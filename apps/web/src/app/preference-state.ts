import type {
  PreferenceCategory,
  PreferencePriority,
  PrivatePreferenceRequest,
  PrivatePreferenceResponse,
} from "@dajeong/api-client";

export interface PreferenceDraft {
  activityLevel: number;
  budgetPerPerson: string;
  preferredCategories: PreferenceCategory[];
  priorities: PreferencePriority[];
  travelTolerance: number;
}

export type PreferenceDraftErrors = Partial<
  Record<keyof PreferenceDraft, string>
>;

export function createEmptyPreferenceDraft(): PreferenceDraft {
  return {
    activityLevel: 3,
    budgetPerPerson: "300000",
    preferredCategories: [],
    priorities: [],
    travelTolerance: 3,
  };
}

export function preferenceResponseToDraft(
  preference: PrivatePreferenceResponse,
): PreferenceDraft {
  return {
    activityLevel: preference.activityLevel,
    budgetPerPerson: String(preference.budgetPerPerson),
    preferredCategories: [...preference.preferredCategories],
    priorities: [...preference.priorities],
    travelTolerance: preference.travelTolerance,
  };
}

export function validatePreferenceDraft(
  draft: PreferenceDraft,
): PreferenceDraftErrors {
  const errors: PreferenceDraftErrors = {};
  const budget = Number(draft.budgetPerPerson);
  if (!Number.isInteger(budget) || budget < 0 || budget > 100_000_000) {
    errors.budgetPerPerson =
      "1인 예산은 0원부터 1억원까지 정수로 입력해 주세요.";
  }
  if (
    !Number.isInteger(draft.activityLevel) ||
    draft.activityLevel < 1 ||
    draft.activityLevel > 5
  ) {
    errors.activityLevel = "활동 강도를 1에서 5 사이로 선택해 주세요.";
  }
  if (
    !Number.isInteger(draft.travelTolerance) ||
    draft.travelTolerance < 1 ||
    draft.travelTolerance > 5
  ) {
    errors.travelTolerance = "이동 허용 정도를 1에서 5 사이로 선택해 주세요.";
  }
  if (
    draft.preferredCategories.length === 0 ||
    draft.preferredCategories.length > 7 ||
    new Set(draft.preferredCategories).size !== draft.preferredCategories.length
  ) {
    errors.preferredCategories = "선호 카테고리를 하나 이상 선택해 주세요.";
  }
  if (
    draft.priorities.length === 0 ||
    draft.priorities.length > 2 ||
    new Set(draft.priorities).size !== draft.priorities.length
  ) {
    errors.priorities = "이번 여행의 우선순위를 한두 개 선택해 주세요.";
  }
  return errors;
}

export function toPrivatePreferenceRequest(
  draft: PreferenceDraft,
): PrivatePreferenceRequest {
  return {
    activityLevel: draft.activityLevel,
    budgetPerPerson: Number(draft.budgetPerPerson),
    preferredCategories: [...draft.preferredCategories],
    priorities: [...draft.priorities],
    travelTolerance: draft.travelTolerance,
  };
}

export function togglePreferenceSelection<Value>(
  values: readonly Value[],
  value: Value,
  maximum: number,
): Value[] {
  if (values.includes(value)) {
    return values.filter((current) => current !== value);
  }
  return values.length >= maximum ? [...values] : [...values, value];
}
