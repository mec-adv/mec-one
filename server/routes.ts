import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  authenticate, 
  authorize, 
  hashPassword, 
  comparePassword, 
  generateTokens, 
  generateTemporaryPassword,
  verifyRefreshToken,
  type AuthRequest 
} from "./auth";
import { insertUserSchema, insertWorkGroupSchema, insertEntitySchema } from "@shared/schema";
import { z } from "zod";

// Seed initial admin user
async function seedAdminUser() {
  try {
    const existingAdmin = await storage.getUserByEmail('admin@mecone.com');
    if (!existingAdmin) {
      const hashedPassword = await hashPassword('admin123');
      await storage.createUser({
        email: 'admin@mecone.com',
        password: hashedPassword,
        firstName: 'Administrator',
        lastName: 'System',
        profile: 'ADMINISTRATOR',
        isActive: true,
      });
      console.log('✓ Admin user created: admin@mecone.com / admin123');
    }
  } catch (error) {
    console.error('Error seeding admin user:', error);
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Seed admin user on startup
  await seedAdminUser();

  // Auth routes
  app.post('/api/auth/login', async (req, res) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ message: 'Email and password are required' });
      }

      const user = await storage.getUserByEmail(email);

      if (!user || !user.isActive) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      const isValidPassword = await comparePassword(password, user.password);

      if (!isValidPassword) {
        return res.status(401).json({ message: 'Invalid credentials' });
      }

      const tokens = generateTokens({
        userId: user.id,
        email: user.email,
        profile: user.profile,
      });

      // Update last login using raw SQL since lastLogin is omitted from insertUserSchema
      await storage.updateUserLastLogin(user.id, new Date());

      // Create session
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
      await storage.createSession(
        user.id, 
        tokens.refreshToken, 
        expiresAt,
        req.ip,
        req.get('User-Agent')
      );

      // Log login
      await storage.createAuditLog({
        userId: user.id,
        action: 'LOGIN',
        table: 'users',
        recordId: user.id,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
      });

      res.json({
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          profile: user.profile,
          mustChangePassword: user.mustChangePassword,
        },
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.post('/api/auth/refresh', async (req, res) => {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        return res.status(400).json({ message: 'Refresh token is required' });
      }

      const payload = verifyRefreshToken(refreshToken);

      if (!payload) {
        return res.status(401).json({ message: 'Invalid refresh token' });
      }

      // Verify session exists and is active
      const session = await storage.getActiveSession(refreshToken);

      if (!session) {
        return res.status(401).json({ message: 'Session not found or expired' });
      }

      const user = await storage.getUser(payload.userId);

      if (!user || !user.isActive) {
        return res.status(401).json({ message: 'User not found or inactive' });
      }

      const tokens = generateTokens({
        userId: user.id,
        email: user.email,
        profile: user.profile,
      });

      res.json({
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      });
    } catch (error) {
      console.error('Token refresh error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.post('/api/auth/logout', authenticate, async (req: AuthRequest, res) => {
    try {
      const { refreshToken } = req.body;

      if (refreshToken) {
        await storage.deactivateSession(refreshToken);
      }

      // Log logout
      await storage.createAuditLog({
        userId: req.user!.id,
        action: 'LOGOUT',
        table: 'users',
        recordId: req.user!.id,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
      });

      res.json({ message: 'Logged out successfully' });
    } catch (error) {
      console.error('Logout error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.post('/api/auth/forgot-password', async (req, res) => {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({ message: 'Email is required' });
      }

      const user = await storage.getUserByEmail(email);

      if (!user) {
        // Don't reveal if user exists
        return res.json({ message: 'If the email exists, a recovery link has been sent' });
      }

      const temporaryPassword = generateTemporaryPassword();
      const hashedPassword = await hashPassword(temporaryPassword);

      await storage.updateUser(user.id, {
        password: hashedPassword,
        temporaryPassword: true,
        mustChangePassword: true,
        updatedAt: new Date(),
      });

      // Log password reset
      await storage.createAuditLog({
        userId: user.id,
        action: 'PASSWORD_RESET',
        table: 'users',
        recordId: user.id,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
      });

      // TODO: Send email with temporary password
      console.log(`Temporary password for ${email}: ${temporaryPassword}`);

      res.json({ message: 'If the email exists, a recovery link has been sent' });
    } catch (error) {
      console.error('Password reset error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.get('/api/auth/me', authenticate, async (req: AuthRequest, res) => {
    try {
      const userWithGroups = await storage.getUserWithWorkGroups(req.user!.id);

      if (!userWithGroups) {
        return res.status(404).json({ message: 'User not found' });
      }

      res.json({
        id: userWithGroups.id,
        email: userWithGroups.email,
        firstName: userWithGroups.firstName,
        lastName: userWithGroups.lastName,
        profile: userWithGroups.profile,
        isActive: userWithGroups.isActive,
        mustChangePassword: userWithGroups.mustChangePassword,
        lastLogin: userWithGroups.lastLogin,
        workGroups: userWithGroups.userWorkGroups.map(uwg => uwg.workGroup),
      });
    } catch (error) {
      console.error('Get user error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Dashboard routes
  app.get('/api/dashboard/stats', authenticate, async (req: AuthRequest, res) => {
    try {
      const stats = await storage.getDashboardStats();
      res.json(stats);
    } catch (error) {
      console.error('Dashboard stats error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // User management routes
  app.get('/api/users', authenticate, authorize(['ADMINISTRATOR', 'MANAGER']), async (req: AuthRequest, res) => {
    try {
      const { search, profile, isActive } = req.query;

      const users = await storage.getUsers({
        search: search as string,
        profile: profile as string,
        isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined,
      });

      res.json(users);
    } catch (error) {
      console.error('Get users error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.post('/api/users', authenticate, authorize(['ADMINISTRATOR', 'MANAGER']), async (req: AuthRequest, res) => {
    try {
      const { workGroupId, ...userData } = req.body;
      
      // Create validation schema that allows workGroupId to be undefined or string
      const createUserSchema = insertUserSchema.extend({
        workGroupId: z.string().optional(),
      });
      
      const validatedData = createUserSchema.parse({ ...userData, workGroupId });
      const { workGroupId: validatedWorkGroupId, ...validatedUserData } = validatedData;

      // Check if email already exists
      const existingUser = await storage.getUserByEmail(validatedUserData.email);
      if (existingUser) {
        return res.status(400).json({ message: 'Email already exists' });
      }

      // Generate temporary password
      const temporaryPassword = generateTemporaryPassword();
      const hashedPassword = await hashPassword(temporaryPassword);

      const newUser = await storage.createUser({
        ...validatedUserData,
        password: hashedPassword,
        temporaryPassword: true,
        mustChangePassword: true,
        createdBy: req.user!.id,
      });

      // Add user to work group if specified
      if (validatedWorkGroupId && validatedWorkGroupId.trim() !== "") {
        await storage.addUserToWorkGroup(newUser.id, validatedWorkGroupId);
      }

      // Log user creation
      await storage.createAuditLog({
        userId: req.user!.id,
        action: 'CREATE',
        table: 'users',
        recordId: newUser.id,
        newValues: { ...newUser, password: '[HIDDEN]', workGroupId: validatedWorkGroupId },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
      });

      // TODO: Send email with temporary credentials
      console.log(`New user created - Email: ${newUser.email}, Password: ${temporaryPassword}`);

      res.status(201).json({ 
        ...newUser, 
        password: undefined,
        temporaryPassword,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Validation error', errors: error.errors });
      }
      console.error('Create user error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.get('/api/users/:id', authenticate, async (req: AuthRequest, res) => {
    try {
      const user = await storage.getUserWithWorkGroups(req.params.id);

      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      res.json({
        ...user,
        password: undefined,
      });
    } catch (error) {
      console.error('Get user error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.put('/api/users/:id', authenticate, authorize(['ADMINISTRATOR', 'MANAGER']), async (req: AuthRequest, res) => {
    try {
      const { workGroupId, ...userData } = req.body;
      const validatedUserData = insertUserSchema.partial().parse(userData);

      const existingUser = await storage.getUser(req.params.id);
      if (!existingUser) {
        return res.status(404).json({ message: 'User not found' });
      }

      // If email is being changed, check for duplicates
      if (validatedUserData.email && validatedUserData.email !== existingUser.email) {
        const emailExists = await storage.getUserByEmail(validatedUserData.email);
        if (emailExists) {
          return res.status(400).json({ message: 'Email already exists' });
        }
      }

      const updatedUser = await storage.updateUser(req.params.id, {
        ...validatedUserData,
        updatedBy: req.user!.id,
      });

      // Update work group association
      if (workGroupId !== undefined) {
        // Remove user from all current work groups
        const currentUser = await storage.getUserWithWorkGroups(req.params.id);
        if (currentUser?.userWorkGroups) {
          for (const userGroup of currentUser.userWorkGroups) {
            await storage.removeUserFromWorkGroup(req.params.id, userGroup.workGroup.id);
          }
        }

        // Add user to new work group if specified
        if (workGroupId && workGroupId.trim() !== "") {
          await storage.addUserToWorkGroup(req.params.id, workGroupId);
        }
      }

      // Log user update
      await storage.createAuditLog({
        userId: req.user!.id,
        action: 'UPDATE',
        table: 'users',
        recordId: req.params.id,
        oldValues: { ...existingUser, password: '[HIDDEN]' },
        newValues: { ...updatedUser, password: '[HIDDEN]', workGroupId },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
      });

      res.json({
        ...updatedUser,
        password: undefined,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Validation error', errors: error.errors });
      }
      console.error('Update user error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.delete('/api/users/:id', authenticate, authorize(['ADMINISTRATOR']), async (req: AuthRequest, res) => {
    try {
      const user = await storage.getUser(req.params.id);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      await storage.deactivateUser(req.params.id);

      // Log user deactivation
      await storage.createAuditLog({
        userId: req.user!.id,
        action: 'DELETE',
        table: 'users',
        recordId: req.params.id,
        oldValues: { ...user, password: '[HIDDEN]' },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
      });

      res.json({ message: 'User deactivated successfully' });
    } catch (error) {
      console.error('Delete user error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Work Group routes
  app.get('/api/work-groups', authenticate, async (req: AuthRequest, res) => {
    try {
      const { search, isActive } = req.query;

      const workGroups = await storage.getWorkGroups({
        search: search as string,
        isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined,
      });

      res.json(workGroups);
    } catch (error) {
      console.error('Get work groups error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.post('/api/work-groups', authenticate, authorize(['ADMINISTRATOR', 'MANAGER']), async (req: AuthRequest, res) => {
    try {
      const workGroupData = insertWorkGroupSchema.parse(req.body);

      // Check if name already exists
      const existingGroup = await storage.getWorkGroupByName(workGroupData.name);
      if (existingGroup) {
        return res.status(400).json({ message: 'Work group name already exists' });
      }

      const newWorkGroup = await storage.createWorkGroup({
        ...workGroupData,
        createdBy: req.user!.id,
      });

      // Log work group creation
      await storage.createAuditLog({
        userId: req.user!.id,
        action: 'CREATE',
        table: 'work_groups',
        recordId: newWorkGroup.id,
        newValues: newWorkGroup,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
      });

      res.status(201).json(newWorkGroup);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Validation error', errors: error.errors });
      }
      console.error('Create work group error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.get('/api/work-groups/:id', authenticate, async (req: AuthRequest, res) => {
    try {
      const workGroup = await storage.getWorkGroupWithUsers(req.params.id);

      if (!workGroup) {
        return res.status(404).json({ message: 'Work group not found' });
      }

      res.json(workGroup);
    } catch (error) {
      console.error('Get work group error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.put('/api/work-groups/:id', authenticate, authorize(['ADMINISTRATOR', 'MANAGER']), async (req: AuthRequest, res) => {
    try {
      const workGroupData = insertWorkGroupSchema.partial().parse(req.body);

      const existingGroup = await storage.getWorkGroup(req.params.id);
      if (!existingGroup) {
        return res.status(404).json({ message: 'Work group not found' });
      }

      // If name is being changed, check for duplicates
      if (workGroupData.name && workGroupData.name !== existingGroup.name) {
        const nameExists = await storage.getWorkGroupByName(workGroupData.name);
        if (nameExists) {
          return res.status(400).json({ message: 'Work group name already exists' });
        }
      }

      const updatedWorkGroup = await storage.updateWorkGroup(req.params.id, {
        ...workGroupData,
        updatedBy: req.user!.id,
      });

      // Log work group update
      await storage.createAuditLog({
        userId: req.user!.id,
        action: 'UPDATE',
        table: 'work_groups',
        recordId: req.params.id,
        oldValues: existingGroup,
        newValues: updatedWorkGroup,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
      });

      res.json(updatedWorkGroup);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Validation error', errors: error.errors });
      }
      console.error('Update work group error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.delete('/api/work-groups/:id', authenticate, authorize(['ADMINISTRATOR']), async (req: AuthRequest, res) => {
    try {
      const workGroup = await storage.getWorkGroup(req.params.id);
      if (!workGroup) {
        return res.status(404).json({ message: 'Work group not found' });
      }

      await storage.deactivateWorkGroup(req.params.id);

      // Log work group deactivation
      await storage.createAuditLog({
        userId: req.user!.id,
        action: 'DELETE',
        table: 'work_groups',
        recordId: req.params.id,
        oldValues: workGroup,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
      });

      res.json({ message: 'Work group deactivated successfully' });
    } catch (error) {
      console.error('Delete work group error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  // Entity routes
  app.get('/api/entities', authenticate, async (req: AuthRequest, res) => {
    try {
      const { search, type, isActive } = req.query;

      const entities = await storage.getEntities({
        search: search as string,
        type: type as string,
        isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined,
      });

      res.json(entities);
    } catch (error) {
      console.error('Get entities error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.post('/api/entities', authenticate, async (req: AuthRequest, res) => {
    try {
      const { entity, addresses, contacts } = req.body;

      const entityData = insertEntitySchema.parse(entity);

      // Check if document already exists
      const existingEntity = await storage.getEntityByDocument(entityData.document);
      if (existingEntity) {
        return res.status(400).json({ message: 'Document already exists' });
      }

      const newEntity = await storage.createEntity({
        ...entityData,
        createdBy: req.user!.id,
      });

      // Add addresses if provided
      if (addresses && addresses.length > 0) {
        for (const address of addresses) {
          await storage.createEntityAddress({
            ...address,
            entityId: newEntity.id,
          });
        }
      }

      // Add contacts if provided
      if (contacts && contacts.length > 0) {
        for (const contact of contacts) {
          await storage.createEntityContact({
            ...contact,
            entityId: newEntity.id,
          });
        }
      }

      // Log entity creation
      await storage.createAuditLog({
        userId: req.user!.id,
        action: 'CREATE',
        table: 'entities',
        recordId: newEntity.id,
        newValues: newEntity,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
      });

      const entityWithDetails = await storage.getEntityWithDetails(newEntity.id);
      res.status(201).json(entityWithDetails);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Validation error', errors: error.errors });
      }
      console.error('Create entity error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.get('/api/entities/:id', authenticate, async (req: AuthRequest, res) => {
    try {
      const entity = await storage.getEntityWithDetails(req.params.id);

      if (!entity) {
        return res.status(404).json({ message: 'Entity not found' });
      }

      res.json(entity);
    } catch (error) {
      console.error('Get entity error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.put('/api/entities/:id', authenticate, async (req: AuthRequest, res) => {
    try {
      const { entity: entityData, addresses, contacts } = req.body;

      const existingEntity = await storage.getEntity(req.params.id);
      if (!existingEntity) {
        return res.status(404).json({ message: 'Entity not found' });
      }

      // If document is being changed, check for duplicates
      if (entityData.document && entityData.document !== existingEntity.document) {
        const documentExists = await storage.getEntityByDocument(entityData.document);
        if (documentExists) {
          return res.status(400).json({ message: 'Document already exists' });
        }
      }

      const updatedEntity = await storage.updateEntity(req.params.id, {
        ...entityData,
        updatedBy: req.user!.id,
      });

      // Update addresses and contacts would require more complex logic
      // For now, we'll just update the main entity

      // Log entity update
      await storage.createAuditLog({
        userId: req.user!.id,
        action: 'UPDATE',
        table: 'entities',
        recordId: req.params.id,
        oldValues: existingEntity,
        newValues: updatedEntity,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
      });

      const entityWithDetails = await storage.getEntityWithDetails(req.params.id);
      res.json(entityWithDetails);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Validation error', errors: error.errors });
      }
      console.error('Update entity error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  app.delete('/api/entities/:id', authenticate, async (req: AuthRequest, res) => {
    try {
      const entity = await storage.getEntity(req.params.id);
      if (!entity) {
        return res.status(404).json({ message: 'Entity not found' });
      }

      await storage.deactivateEntity(req.params.id);

      // Log entity deactivation
      await storage.createAuditLog({
        userId: req.user!.id,
        action: 'DELETE',
        table: 'entities',
        recordId: req.params.id,
        oldValues: entity,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
      });

      res.json({ message: 'Entity deactivated successfully' });
    } catch (error) {
      console.error('Delete entity error:', error);
      res.status(500).json({ message: 'Internal server error' });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}