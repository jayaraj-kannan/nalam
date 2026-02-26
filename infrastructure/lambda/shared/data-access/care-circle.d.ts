import { PermissionSet, RelationshipType } from '../types';
interface CareCircleRelationship {
    primaryUserId: string;
    secondaryUserId: string;
    relationship: RelationshipType;
    permissions: PermissionSet;
    joinedAt: string;
    lastActive: string;
}
export declare function addCareCircleMember(primaryUserId: string, secondaryUserId: string, relationship: RelationshipType, permissions: PermissionSet): Promise<void>;
export declare function getCareCircleMember(primaryUserId: string, secondaryUserId: string): Promise<CareCircleRelationship | null>;
export declare function getCareCircleMembers(primaryUserId: string): Promise<CareCircleRelationship[]>;
export declare function updateCareCirclePermissions(primaryUserId: string, secondaryUserId: string, permissions: PermissionSet): Promise<void>;
export declare function updateCareCircleRelationship(primaryUserId: string, secondaryUserId: string, relationship: RelationshipType): Promise<void>;
export declare function updateCareCircleLastActive(primaryUserId: string, secondaryUserId: string): Promise<void>;
export declare function removeCareCircleMember(primaryUserId: string, secondaryUserId: string): Promise<void>;
export declare function checkPermission(primaryUserId: string, secondaryUserId: string, permission: keyof PermissionSet): Promise<boolean>;
export {};
