// Users Table Data Access Layer
// Requirements: 8.1, 8.4

import { PrimaryUser, SecondaryUser } from '../types';
import { TABLES, putItem, getItem, queryItems, updateItem, deleteItem } from '../dynamodb-client';

// ============================================================================
// User Operations
// ============================================================================

export async function createUser(user: PrimaryUser | SecondaryUser): Promise<void> {
  await putItem(TABLES.USERS, {
    ...user,
    createdAt: new Date().toISOString(),
    lastActive: new Date().toISOString(),
  });
}

export async function getUser(userId: string): Promise<PrimaryUser | SecondaryUser | null> {
  return await getItem<PrimaryUser | SecondaryUser>(TABLES.USERS, { userId });
}

export async function getUserByEmail(email: string): Promise<PrimaryUser | SecondaryUser | null> {
  const results = await queryItems<PrimaryUser | SecondaryUser>(
    TABLES.USERS,
    'email = :email',
    { ':email': email },
    'email-index',
    undefined,
    1
  );
  return results[0] || null;
}

export async function updateUserProfile(
  userId: string,
  updates: Partial<PrimaryUser | SecondaryUser>
): Promise<void> {
  const updateExpressions: string[] = [];
  const expressionAttributeValues: Record<string, unknown> = {};
  const expressionAttributeNames: Record<string, string> = {};

  Object.entries(updates).forEach(([key, value], index) => {
    const attrName = `#attr${index}`;
    const attrValue = `:val${index}`;
    updateExpressions.push(`${attrName} = ${attrValue}`);
    expressionAttributeNames[attrName] = key;
    expressionAttributeValues[attrValue] = value;
  });

  await updateItem(
    TABLES.USERS,
    { userId },
    `SET ${updateExpressions.join(', ')}, lastActive = :lastActive`,
    { ...expressionAttributeValues, ':lastActive': new Date().toISOString() },
    expressionAttributeNames
  );
}

export async function updateLastActive(userId: string): Promise<void> {
  await updateItem(
    TABLES.USERS,
    { userId },
    'SET lastActive = :lastActive',
    { ':lastActive': new Date().toISOString() }
  );
}

export async function deleteUser(userId: string): Promise<void> {
  await deleteItem(TABLES.USERS, { userId });
}
