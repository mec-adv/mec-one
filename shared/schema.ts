import {
  pgTable,
  text,
  varchar,
  timestamp,
  boolean,
  json,
  index,
  uuid,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

// Enums
export const userProfiles = [
  "ADMINISTRATOR",
  "MANAGER", 
  "COORDINATOR",
  "NEGOTIATOR",
  "LAWYER",
  "CONTROLLER"
] as const;

export const entityTypes = ["INDIVIDUAL", "COMPANY"] as const;
export const contactStatuses = ["ACTIVE", "PRIMARY", "INACTIVE"] as const;

// Session storage table for authentication
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: json("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// Users table
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  firstName: varchar("first_name", { length: 100 }).notNull(),
  lastName: varchar("last_name", { length: 100 }).notNull(),
  password: text("password").notNull(),
  profile: varchar("profile", { length: 20 }).notNull().$type<typeof userProfiles[number]>(),
  isActive: boolean("is_active").default(true).notNull(),
  temporaryPassword: boolean("temporary_password").default(false).notNull(),
  mustChangePassword: boolean("must_change_password").default(true).notNull(),
  lastLogin: timestamp("last_login"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  createdBy: uuid("created_by"),
  updatedBy: uuid("updated_by"),
});

// Work Groups table
export const workGroups = pgTable("work_groups", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 100 }).notNull().unique(),
  description: text("description"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  createdBy: uuid("created_by"),
  updatedBy: uuid("updated_by"),
});

// User Work Groups junction table
export const userWorkGroups = pgTable("user_work_groups", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  groupId: uuid("group_id").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Entities table
export const entities = pgTable("entities", {
  id: uuid("id").primaryKey().defaultRandom(),
  type: varchar("type", { length: 20 }).notNull().$type<typeof entityTypes[number]>(),
  name: varchar("name", { length: 255 }).notNull(),
  document: varchar("document", { length: 20 }).notNull().unique(),
  municipalRegistration: varchar("municipal_registration", { length: 50 }),
  stateRegistration: varchar("state_registration", { length: 50 }),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  createdBy: uuid("created_by"),
  updatedBy: uuid("updated_by"),
  externalId: varchar("external_id", { length: 100 }),
});

// Entity Addresses table
export const entityAddresses = pgTable("entity_addresses", {
  id: uuid("id").primaryKey().defaultRandom(),
  entityId: uuid("entity_id").notNull(),
  street: varchar("street", { length: 255 }).notNull(),
  number: varchar("number", { length: 20 }),
  complement: varchar("complement", { length: 100 }),
  neighborhood: varchar("neighborhood", { length: 100 }).notNull(),
  zipCode: varchar("zip_code", { length: 10 }).notNull(),
  city: varchar("city", { length: 100 }).notNull(),
  state: varchar("state", { length: 2 }).notNull(),
  country: varchar("country", { length: 50 }).default("Brasil").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  isPrimary: boolean("is_primary").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Entity Contacts table
export const entityContacts = pgTable("entity_contacts", {
  id: uuid("id").primaryKey().defaultRandom(),
  entityId: uuid("entity_id").notNull(),
  name: varchar("name", { length: 100 }),
  role: varchar("role", { length: 100 }),
  phone: varchar("phone", { length: 20 }),
  mobile: varchar("mobile", { length: 20 }),
  email: varchar("email", { length: 255 }),
  telegram: varchar("telegram", { length: 100 }),
  instagram: varchar("instagram", { length: 100 }),
  facebook: varchar("facebook", { length: 100 }),
  linkedin: varchar("linkedin", { length: 100 }),
  status: varchar("status", { length: 20 }).default("ACTIVE").notNull().$type<typeof contactStatuses[number]>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Audit Log table
export const auditLogs = pgTable("audit_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id"),
  action: varchar("action", { length: 50 }).notNull(),
  table: varchar("table", { length: 50 }).notNull(),
  recordId: uuid("record_id"),
  oldValues: json("old_values"),
  newValues: json("new_values"),
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// User Sessions table
export const userSessions = pgTable("user_sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  token: text("token").notNull().unique(),
  isActive: boolean("is_active").default(true).notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  lastUsed: timestamp("last_used").defaultNow().notNull(),
});

// System Config table
export const systemConfigs = pgTable("system_configs", {
  id: uuid("id").primaryKey().defaultRandom(),
  key: varchar("key", { length: 100 }).notNull().unique(),
  value: text("value").notNull(),
  description: text("description"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Relations
export const usersRelations = relations(users, ({ one, many }) => ({
  userWorkGroups: many(userWorkGroups),
  auditLogs: many(auditLogs),
  createdUsers: many(users, { relationName: "UserCreator" }),
  creator: one(users, {
    fields: [users.createdBy],
    references: [users.id],
    relationName: "UserCreator",
  }),
}));

export const workGroupsRelations = relations(workGroups, ({ many }) => ({
  userWorkGroups: many(userWorkGroups),
}));

export const userWorkGroupsRelations = relations(userWorkGroups, ({ one }) => ({
  user: one(users, {
    fields: [userWorkGroups.userId],
    references: [users.id],
  }),
  workGroup: one(workGroups, {
    fields: [userWorkGroups.groupId],
    references: [workGroups.id],
  }),
}));

export const entitiesRelations = relations(entities, ({ many }) => ({
  addresses: many(entityAddresses),
  contacts: many(entityContacts),
}));

export const entityAddressesRelations = relations(entityAddresses, ({ one }) => ({
  entity: one(entities, {
    fields: [entityAddresses.entityId],
    references: [entities.id],
  }),
}));

export const entityContactsRelations = relations(entityContacts, ({ one }) => ({
  entity: one(entities, {
    fields: [entityContacts.entityId],
    references: [entities.id],
  }),
}));

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  user: one(users, {
    fields: [auditLogs.userId],
    references: [users.id],
  }),
}));

export const userSessionsRelations = relations(userSessions, ({ one }) => ({
  user: one(users, {
    fields: [userSessions.userId],
    references: [users.id],
  }),
}));

// Zod schemas
export const insertUserSchema = createInsertSchema(users, {
  email: z.string().email(),
  profile: z.enum(userProfiles),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  lastLogin: true,
});

export const insertWorkGroupSchema = createInsertSchema(workGroups).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertEntitySchema = createInsertSchema(entities, {
  type: z.enum(entityTypes),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertEntityAddressSchema = createInsertSchema(entityAddresses).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertEntityContactSchema = createInsertSchema(entityContacts, {
  status: z.enum(contactStatuses),
}).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertAuditLogSchema = createInsertSchema(auditLogs).omit({
  id: true,
  createdAt: true,
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type WorkGroup = typeof workGroups.$inferSelect;
export type InsertWorkGroup = z.infer<typeof insertWorkGroupSchema>;
export type Entity = typeof entities.$inferSelect;
export type InsertEntity = z.infer<typeof insertEntitySchema>;
export type EntityAddress = typeof entityAddresses.$inferSelect;
export type InsertEntityAddress = z.infer<typeof insertEntityAddressSchema>;
export type EntityContact = typeof entityContacts.$inferSelect;
export type InsertEntityContact = z.infer<typeof insertEntityContactSchema>;
export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;
export type UserSession = typeof userSessions.$inferSelect;

// Extended types with relations
export type UserWithWorkGroups = User & {
  userWorkGroups: (typeof userWorkGroups.$inferSelect & {
    workGroup: WorkGroup;
  })[];
};

export type EntityWithAddressesAndContacts = Entity & {
  addresses: EntityAddress[];
  contacts: EntityContact[];
};

export type WorkGroupWithUsers = WorkGroup & {
  userWorkGroups: (typeof userWorkGroups.$inferSelect & {
    user: User;
  })[];
};
