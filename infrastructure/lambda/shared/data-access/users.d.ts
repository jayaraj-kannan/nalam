import { PrimaryUser, SecondaryUser } from '../types';
export declare function createUser(user: PrimaryUser | SecondaryUser): Promise<void>;
export declare function getUser(userId: string): Promise<PrimaryUser | SecondaryUser | null>;
export declare function getUserByEmail(email: string): Promise<PrimaryUser | SecondaryUser | null>;
export declare function updateUserProfile(userId: string, updates: Partial<PrimaryUser | SecondaryUser>): Promise<void>;
export declare function updateLastActive(userId: string): Promise<void>;
export declare function deleteUser(userId: string): Promise<void>;
