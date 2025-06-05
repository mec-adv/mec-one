import {
  users,
  workGroups,
  userWorkGroups,
  entities,
  entityAddresses,
  entityContacts,
  auditLogs,
  userSessions,
  type User,
  type InsertUser,
  type WorkGroup,
  type InsertWorkGroup,
  type Entity,
  type InsertEntity,
  type EntityAddress,
  type InsertEntityAddress,
  type EntityContact,
  type InsertEntityContact,
  type UserWithWorkGroups,
  type EntityWithAddressesAndContacts,
  type WorkGroupWithUsers,
  type InsertAuditLog,
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, ilike, or } from "drizzle-orm";

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserWithWorkGroups(id: string): Promise<UserWithWorkGroups | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, user: Partial<InsertUser>): Promise<User>;
  updateUserLastLogin(id: string, lastLogin: Date): Promise<void>;
  deactivateUser(id: string): Promise<void>;
  getUsers(filters?: { search?: string; profile?: string; isActive?: boolean }): Promise<UserWithWorkGroups[]>;
  
  // Work Group operations
  getWorkGroup(id: string): Promise<WorkGroup | undefined>;
  getWorkGroupByName(name: string): Promise<WorkGroup | undefined>;
  getWorkGroupWithUsers(id: string): Promise<WorkGroupWithUsers | undefined>;
  createWorkGroup(workGroup: InsertWorkGroup): Promise<WorkGroup>;
  updateWorkGroup(id: string, workGroup: Partial<InsertWorkGroup>): Promise<WorkGroup>;
  deactivateWorkGroup(id: string): Promise<void>;
  getWorkGroups(filters?: { search?: string; isActive?: boolean }): Promise<WorkGroupWithUsers[]>;
  
  // User Work Group operations
  addUserToWorkGroup(userId: string, groupId: string): Promise<void>;
  removeUserFromWorkGroup(userId: string, groupId: string): Promise<void>;
  
  // Entity operations
  getEntity(id: string): Promise<Entity | undefined>;
  getEntityByDocument(document: string): Promise<Entity | undefined>;
  getEntityWithDetails(id: string): Promise<EntityWithAddressesAndContacts | undefined>;
  createEntity(entity: InsertEntity): Promise<Entity>;
  updateEntity(id: string, entity: Partial<InsertEntity>): Promise<Entity>;
  deactivateEntity(id: string): Promise<void>;
  getEntities(filters?: { search?: string; type?: string; isActive?: boolean }): Promise<EntityWithAddressesAndContacts[]>;
  
  // Entity Address operations
  createEntityAddress(address: InsertEntityAddress): Promise<EntityAddress>;
  updateEntityAddress(id: string, address: Partial<InsertEntityAddress>): Promise<EntityAddress>;
  deleteEntityAddress(id: string): Promise<void>;
  
  // Entity Contact operations
  createEntityContact(contact: InsertEntityContact): Promise<EntityContact>;
  updateEntityContact(id: string, contact: Partial<InsertEntityContact>): Promise<EntityContact>;
  deleteEntityContact(id: string): Promise<void>;
  
  // Session operations
  createSession(userId: string, token: string, expiresAt: Date, ipAddress?: string, userAgent?: string): Promise<void>;
  getActiveSession(token: string): Promise<any>;
  deactivateSession(token: string): Promise<void>;
  
  // Audit operations
  createAuditLog(log: InsertAuditLog): Promise<void>;
  
  // Dashboard stats
  getDashboardStats(): Promise<{
    totalUsers: number;
    totalEntities: number;
    activeGroups: number;
    todayActivity: number;
  }>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async getUserWithWorkGroups(id: string): Promise<UserWithWorkGroups | undefined> {
    const result = await db.query.users.findFirst({
      where: eq(users.id, id),
      with: {
        userWorkGroups: {
          with: {
            workGroup: true,
          },
        },
      },
    });
    return result as UserWithWorkGroups | undefined;
  }

  async createUser(user: InsertUser): Promise<User> {
    const [newUser] = await db.insert(users).values(user).returning();
    return newUser;
  }

  async updateUser(id: string, userData: Partial<InsertUser>): Promise<User> {
    const [updatedUser] = await db
      .update(users)
      .set({ ...userData, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();
    return updatedUser;
  }

  async updateUserLastLogin(id: string, lastLogin: Date): Promise<void> {
    await db
      .update(users)
      .set({ lastLogin, updatedAt: new Date() })
      .where(eq(users.id, id));
  }

  async deactivateUser(id: string): Promise<void> {
    await db
      .update(users)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(users.id, id));
  }

  async getUsers(filters?: { search?: string; profile?: string; isActive?: boolean }): Promise<UserWithWorkGroups[]> {
    let query = db.query.users.findMany({
      with: {
        userWorkGroups: {
          with: {
            workGroup: true,
          },
        },
      },
      orderBy: [desc(users.createdAt)],
    });

    // Apply filters if needed
    if (filters) {
      const conditions = [];
      
      if (filters.search) {
        conditions.push(
          or(
            ilike(users.firstName, `%${filters.search}%`),
            ilike(users.lastName, `%${filters.search}%`),
            ilike(users.email, `%${filters.search}%`)
          )
        );
      }
      
      if (filters.profile) {
        conditions.push(eq(users.profile, filters.profile as any));
      }
      
      if (filters.isActive !== undefined) {
        conditions.push(eq(users.isActive, filters.isActive));
      }

      if (conditions.length > 0) {
        query = db.query.users.findMany({
          where: and(...conditions),
          with: {
            userWorkGroups: {
              with: {
                workGroup: true,
              },
            },
          },
          orderBy: [desc(users.createdAt)],
        });
      }
    }

    const result = await query;
    return result as UserWithWorkGroups[];
  }

  // Work Group operations
  async getWorkGroup(id: string): Promise<WorkGroup | undefined> {
    const [workGroup] = await db.select().from(workGroups).where(eq(workGroups.id, id));
    return workGroup;
  }

  async getWorkGroupByName(name: string): Promise<WorkGroup | undefined> {
    const [workGroup] = await db.select().from(workGroups).where(eq(workGroups.name, name));
    return workGroup;
  }

  async getWorkGroupWithUsers(id: string): Promise<WorkGroupWithUsers | undefined> {
    const result = await db.query.workGroups.findFirst({
      where: eq(workGroups.id, id),
      with: {
        userWorkGroups: {
          with: {
            user: true,
          },
        },
      },
    });
    return result as WorkGroupWithUsers | undefined;
  }

  async createWorkGroup(workGroup: InsertWorkGroup): Promise<WorkGroup> {
    const [newWorkGroup] = await db.insert(workGroups).values(workGroup).returning();
    return newWorkGroup;
  }

  async updateWorkGroup(id: string, workGroupData: Partial<InsertWorkGroup>): Promise<WorkGroup> {
    const [updatedWorkGroup] = await db
      .update(workGroups)
      .set({ ...workGroupData, updatedAt: new Date() })
      .where(eq(workGroups.id, id))
      .returning();
    return updatedWorkGroup;
  }

  async deactivateWorkGroup(id: string): Promise<void> {
    await db
      .update(workGroups)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(workGroups.id, id));
  }

  async getWorkGroups(filters?: { search?: string; isActive?: boolean }): Promise<WorkGroupWithUsers[]> {
    let query = db.query.workGroups.findMany({
      with: {
        userWorkGroups: {
          with: {
            user: true,
          },
        },
      },
      orderBy: [desc(workGroups.createdAt)],
    });

    if (filters) {
      const conditions = [];
      
      if (filters.search) {
        conditions.push(ilike(workGroups.name, `%${filters.search}%`));
      }
      
      if (filters.isActive !== undefined) {
        conditions.push(eq(workGroups.isActive, filters.isActive));
      }

      if (conditions.length > 0) {
        query = db.query.workGroups.findMany({
          where: and(...conditions),
          with: {
            userWorkGroups: {
              with: {
                user: true,
              },
            },
          },
          orderBy: [desc(workGroups.createdAt)],
        });
      }
    }

    const result = await query;
    return result as WorkGroupWithUsers[];
  }

  // User Work Group operations
  async addUserToWorkGroup(userId: string, groupId: string): Promise<void> {
    await db.insert(userWorkGroups).values({ userId, groupId });
  }

  async removeUserFromWorkGroup(userId: string, groupId: string): Promise<void> {
    await db
      .delete(userWorkGroups)
      .where(and(eq(userWorkGroups.userId, userId), eq(userWorkGroups.groupId, groupId)));
  }

  // Entity operations
  async getEntity(id: string): Promise<Entity | undefined> {
    const [entity] = await db.select().from(entities).where(eq(entities.id, id));
    return entity;
  }

  async getEntityByDocument(document: string): Promise<Entity | undefined> {
    const [entity] = await db.select().from(entities).where(eq(entities.document, document));
    return entity;
  }

  async getEntityWithDetails(id: string): Promise<EntityWithAddressesAndContacts | undefined> {
    const result = await db.query.entities.findFirst({
      where: eq(entities.id, id),
      with: {
        addresses: true,
        contacts: true,
      },
    });
    return result as EntityWithAddressesAndContacts | undefined;
  }

  async createEntity(entity: InsertEntity): Promise<Entity> {
    const [newEntity] = await db.insert(entities).values(entity).returning();
    return newEntity;
  }

  async updateEntity(id: string, entityData: Partial<InsertEntity>): Promise<Entity> {
    const [updatedEntity] = await db
      .update(entities)
      .set({ ...entityData, updatedAt: new Date() })
      .where(eq(entities.id, id))
      .returning();
    return updatedEntity;
  }

  async deactivateEntity(id: string): Promise<void> {
    await db
      .update(entities)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(entities.id, id));
  }

  async getEntities(filters?: { search?: string; type?: string; isActive?: boolean }): Promise<EntityWithAddressesAndContacts[]> {
    let query = db.query.entities.findMany({
      with: {
        addresses: true,
        contacts: true,
      },
      orderBy: [desc(entities.createdAt)],
    });

    if (filters) {
      const conditions = [];
      
      if (filters.search) {
        conditions.push(
          or(
            ilike(entities.name, `%${filters.search}%`),
            ilike(entities.document, `%${filters.search}%`)
          )
        );
      }
      
      if (filters.type) {
        conditions.push(eq(entities.type, filters.type as any));
      }
      
      if (filters.isActive !== undefined) {
        conditions.push(eq(entities.isActive, filters.isActive));
      }

      if (conditions.length > 0) {
        query = db.query.entities.findMany({
          where: and(...conditions),
          with: {
            addresses: true,
            contacts: true,
          },
          orderBy: [desc(entities.createdAt)],
        });
      }
    }

    const result = await query;
    return result as EntityWithAddressesAndContacts[];
  }

  // Entity Address operations
  async createEntityAddress(address: InsertEntityAddress): Promise<EntityAddress> {
    const [newAddress] = await db.insert(entityAddresses).values(address).returning();
    return newAddress;
  }

  async updateEntityAddress(id: string, addressData: Partial<InsertEntityAddress>): Promise<EntityAddress> {
    const [updatedAddress] = await db
      .update(entityAddresses)
      .set({ ...addressData, updatedAt: new Date() })
      .where(eq(entityAddresses.id, id))
      .returning();
    return updatedAddress;
  }

  async deleteEntityAddress(id: string): Promise<void> {
    await db.delete(entityAddresses).where(eq(entityAddresses.id, id));
  }

  // Entity Contact operations
  async createEntityContact(contact: InsertEntityContact): Promise<EntityContact> {
    const [newContact] = await db.insert(entityContacts).values(contact).returning();
    return newContact;
  }

  async updateEntityContact(id: string, contactData: Partial<InsertEntityContact>): Promise<EntityContact> {
    const [updatedContact] = await db
      .update(entityContacts)
      .set({ ...contactData, updatedAt: new Date() })
      .where(eq(entityContacts.id, id))
      .returning();
    return updatedContact;
  }

  async deleteEntityContact(id: string): Promise<void> {
    await db.delete(entityContacts).where(eq(entityContacts.id, id));
  }

  // Session operations
  async createSession(userId: string, token: string, expiresAt: Date, ipAddress?: string, userAgent?: string): Promise<void> {
    await db.insert(userSessions).values({
      userId,
      token,
      expiresAt,
      ipAddress,
      userAgent,
    });
  }

  async getActiveSession(token: string): Promise<any> {
    const [session] = await db
      .select()
      .from(userSessions)
      .where(and(eq(userSessions.token, token), eq(userSessions.isActive, true)));
    return session;
  }

  async deactivateSession(token: string): Promise<void> {
    await db
      .update(userSessions)
      .set({ isActive: false })
      .where(eq(userSessions.token, token));
  }

  // Audit operations
  async createAuditLog(log: InsertAuditLog): Promise<void> {
    await db.insert(auditLogs).values(log);
  }

  // Dashboard stats
  async getDashboardStats(): Promise<{
    totalUsers: number;
    totalEntities: number;
    activeGroups: number;
    todayActivity: number;
  }> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [totalUsersResult] = await db.select({ count: users.id }).from(users).where(eq(users.isActive, true));
    const [totalEntitiesResult] = await db.select({ count: entities.id }).from(entities).where(eq(entities.isActive, true));
    const [activeGroupsResult] = await db.select({ count: workGroups.id }).from(workGroups).where(eq(workGroups.isActive, true));
    const [todayActivityResult] = await db.select({ count: auditLogs.id }).from(auditLogs).where(eq(auditLogs.createdAt, today));

    return {
      totalUsers: totalUsersResult?.count || 0,
      totalEntities: totalEntitiesResult?.count || 0,
      activeGroups: activeGroupsResult?.count || 0,
      todayActivity: todayActivityResult?.count || 0,
    };
  }
}

export const storage = new DatabaseStorage();
