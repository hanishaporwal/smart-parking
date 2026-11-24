// ============================================================================
// PARKWAY CLAIM REGISTRY (src/scenarios/registry.ts)
// Single source of truth for claims: 2, 5, 12, 7, 9.
// Validates all claims upon loading; invalid claims have isValid: false and
// are disabled with "Claim data invalid".
// ============================================================================

import { ClaimDefinition, validateClaim, ClaimValidationResult, ClaimNumber } from './types';
import { claim2 } from './claims/claim2';
import { claim5 } from './claims/claim5';
import { claim12 } from './claims/claim12';
import { claim7 } from './claims/claim7';

export interface RegisteredClaim {
  claim: ClaimDefinition;
  validation: ClaimValidationResult;
  isValid: boolean;
}

const RAW_CLAIMS: ClaimDefinition[] = [claim2, claim5, claim12, claim7];

export const REGISTERED_CLAIMS: RegisteredClaim[] = RAW_CLAIMS.map((claim) => {
  const validation = validateClaim(claim);
  if (!validation.valid) {
    console.warn(`[ClaimRegistry] Claim ${claim.number} is invalid:`, validation.errors);
  }
  return {
    claim,
    validation,
    isValid: validation.valid,
  };
});

export function getRegisteredClaim(claimNumber: ClaimNumber | number): RegisteredClaim | undefined {
  return REGISTERED_CLAIMS.find((r) => r.claim.number === claimNumber);
}

export function getAllRegisteredClaims(): RegisteredClaim[] {
  return REGISTERED_CLAIMS;
}

export default REGISTERED_CLAIMS;
