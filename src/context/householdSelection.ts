import type { HouseholdOption } from "../types";

export function chooseInitialHousehold(households: HouseholdOption[], savedHouseholdId: string | null): string | null {
  if (savedHouseholdId && households.some((household) => household.id === savedHouseholdId)) {
    return savedHouseholdId;
  }
  return households.length === 1 ? households[0].id : null;
}
