// Care Circle Table Data Access Layer
// Requirements: 4.1, 8.1, 8.4, 8.5

import { CareCircleMember, PermissionSet, RelationshipType } from '../types';
import { TABLES, putItem, getItem, queryItems, updateItem, deleteItem } from '../dynamodb-client';

// ============================================================================
// Care Circle Operations
// ============================================================================

interface CareCircleRelationship {
  primaryUserId: string;
  secondaryUserId: string;
  relationship: RelationshipType;
  permissions: PermissionSet;
  joinedAt: string;
  lastActive: string;
}

export async function addCareCircleMember(
  primaryUserId: string,
  secondaryUserId: string,
  relationship: RelationshipType,
  permissions: PermissionSet
): Promise<void> {
  await putItem(TABLES.CARE_CIRCLE, {
    primaryUserId,
    secondaryUserId,
    relationship,
    permissions,
    joinedAt: new Date().toISOString(),
    lastActive: new Date().toISOString(),
  });
}

export async function getCareCircleMember(
  primaryUserId: string,
  secondaryUserId: string
): Promise<CareCircleRelationship | null> {
  return await getItem<CareCircleRelationship>(TABLES.CARE_CIRCLE, {
    primaryUserId,
    secondaryUserId,
  });
}

export async function getCareCircleMembers(
  primaryUserId: string
): Promise<CareCircleRelationship[]> {
  return await queryItems<CareCircleRelationship>(
    TABLES.CARE_CIRCLE,
    'primaryUserId = :primaryUserId',
    { ':primaryUserId': primaryUserId }
  );
}

export async function updateCareCirclePermissions(
  primaryUserId: string,
  secondaryUserId: string,
  permissions: PermissionSet
): Promise<void> {
  await updateItem(
    TABLES.CARE_CIRCLE,
    { primaryUserId, secondaryUserId },
    'SET permissions = :permissions, lastActive = :lastActive',
    {
      ':permissions': permissions,
      ':lastActive': new Date().toISOString(),
    }
  );
}

export async function updateCareCircleRelationship(
  primaryUserId: string,
  secondaryUserId: string,
  relationship: RelationshipType
): Promise<void> {
  await updateItem(
    TABLES.CARE_CIRCLE,
    { primaryUserId, secondaryUserId },
    'SET relationship = :relationship, lastActive = :lastActive',
    {
      ':relationship': relationship,
      ':lastActive': new Date().toISOString(),
    }
  );
}

export async function updateCareCircleLastActive(
  primaryUserId: string,
  secondaryUserId: string
): Promise<void> {
  await updateItem(
    TABLES.CARE_CIRCLE,
    { primaryUserId, secondaryUserId },
    'SET lastActive = :lastActive',
    { ':lastActive': new Date().toISOString() }
  );
}

export async function removeCareCircleMember(
  primaryUserId: string,
  secondaryUserId: string
): Promise<void> {
  await deleteItem(TABLES.CARE_CIRCLE, { primaryUserId, secondaryUserId });
}

export async function checkPermission(
  primaryUserId: string,
  secondaryUserId: string,
  permission: keyof PermissionSet
): Promise<boolean> {
  const member = await getCareCircleMember(primaryUserId, secondaryUserId);
  return member?.permissions[permission] || false;
}
